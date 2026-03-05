<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import type { KnobWidget as KnobWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: KnobWidgetType;
}>();

const deviceStore = useDeviceStore();

const device = computed(() => deviceStore.devices[props.widget.config.deviceId]);
const capability = computed(() => device.value?.capabilities[props.widget.config.capabilityId]);

// Detect 0–1 capabilities (e.g. dim) and scale display to 0–100
const isNormalized = computed(() => {
  if (props.widget.config.min != null || props.widget.config.max != null) return false;
  const capMin = capability.value?.min;
  const capMax = capability.value?.max;
  return capMin === 0 && capMax === 1;
});

const min = computed(() => {
  if (isNormalized.value) return 0;
  return props.widget.config.min ?? capability.value?.min ?? 0;
});
const max = computed(() => {
  if (isNormalized.value) return 100;
  return props.widget.config.max ?? capability.value?.max ?? 100;
});
const step = computed(() => {
  if (isNormalized.value && !props.widget.config.step) return 1;
  return props.widget.config.step ?? capability.value?.step ?? 0;
});
const unit = computed(() => {
  if (isNormalized.value && !props.widget.config.unit) return "%";
  return props.widget.config.unit ?? capability.value?.units ?? "";
});

const liveValue = computed(() => {
  const v = capability.value?.value;
  if (typeof v !== "number") return min.value;
  return isNormalized.value ? v * 100 : v;
});

const localValue = ref(liveValue.value);
const isDragging = ref(false);

watch(liveValue, (v) => {
  if (!isDragging.value) localValue.value = v;
});

function toApiValue(displayVal: number): number {
  return isNormalized.value ? displayVal / 100 : displayVal;
}

// --- Knob geometry ---
// 270° sweep: from 225° (bottom-left) to -45°/315° (bottom-right)
const CX = 100;
const CY = 100;
const R_TRACK = 88;       // outer ring/track radius
const R_BODY = 70;        // knob body radius
const R_NOTCH_IN = 50;    // inner end of indicator notch
const R_NOTCH_OUT = 66;   // outer end (just inside body edge)
const TRACK_STROKE = 6;
const START_DEG = 225;
const END_DEG = -45;
const SWEEP_DEG = 270;

function toSvg(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

// Background track arc (full 270°)
const bgArc = computed(() => {
  const s = toSvg(START_DEG, R_TRACK);
  const e = toSvg(END_DEG, R_TRACK);
  return `M ${s.x} ${s.y} A ${R_TRACK} ${R_TRACK} 0 1 1 ${e.x} ${e.y}`;
});

function valueToAngle(value: number): number {
  const range = max.value - min.value;
  if (range <= 0) return START_DEG;
  const ratio = Math.max(0, Math.min(1, (value - min.value) / range));
  return START_DEG - ratio * SWEEP_DEG;
}

function angleToValue(angleDeg: number): number {
  const ratio = (START_DEG - angleDeg) / SWEEP_DEG;
  const clamped = Math.max(0, Math.min(1, ratio));
  let val = min.value + clamped * (max.value - min.value);
  if (step.value > 0) {
    val = Math.round((val - min.value) / step.value) * step.value + min.value;
  }
  return Math.max(min.value, Math.min(max.value, val));
}

const currentAngle = computed(() => valueToAngle(localValue.value));

// Accent arc on outer track showing value progress
const valueArc = computed(() => {
  const angle = currentAngle.value;
  if (angle >= START_DEG) return "";
  const s = toSvg(START_DEG, R_TRACK);
  const e = toSvg(angle, R_TRACK);
  const sweep = START_DEG - angle;
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${R_TRACK} ${R_TRACK} 0 ${large} 1 ${e.x} ${e.y}`;
});

// Indicator notch line (short mark near knob edge)
const notchInner = computed(() => toSvg(currentAngle.value, R_NOTCH_IN));
const notchOuter = computed(() => toSvg(currentAngle.value, R_NOTCH_OUT));

// Tick mark positions around the track
const ticks = computed(() => {
  const count = 9; // 0%, 12.5%, 25%, ... 100%
  return Array.from({ length: count }, (_, i) => {
    const angle = START_DEG - (i / (count - 1)) * SWEEP_DEG;
    const outer = toSvg(angle, R_TRACK + 6);
    const inner = toSvg(angle, R_TRACK - 6);
    return { outer, inner, major: i % 2 === 0 };
  });
});

// Display value
const displayValue = computed(() => {
  const v = localValue.value;
  if (isNormalized.value) return Math.round(v).toString();
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
});

// --- Touch interaction ---
const svgRef = ref<SVGSVGElement | null>(null);
let prevAngle = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_ANGLE_STEP = 15; // max degrees per pointer event (damping)

function getPointerAngle(e: PointerEvent): number {
  if (!svgRef.value) return 0;
  const rect = svgRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = e.clientX - cx;
  const dy = -(e.clientY - cy); // flip y for math coordinates
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180 to 180
  return angle;
}

// Normalize angle to the valid 270° arc range
// Returns angle in the range [END_DEG, START_DEG] = [-45, 225]
// Or null if in the dead zone
function normalizeToArc(rawAngle: number, prev: number): number {
  // Normalize to [-180, 180] first
  let a = rawAngle;
  while (a > 180) a -= 360;
  while (a < -180) a += 360;

  // Dead zone: the 90° gap at the bottom, centered at -90° (i.e., 270° or straight down)
  // Dead zone spans from -45° (END_DEG) going CW to -135° (which is 225° going the other way)
  // In normalized terms: -135 < angle < -45 is the dead zone
  // Actually: dead zone is from -135° to -45° (the bottom 90°)
  const DEAD_LEFT = -135; // left edge of dead zone (corresponds to min side)
  const DEAD_RIGHT = -45; // right edge of dead zone (corresponds to max side)

  if (a < DEAD_RIGHT && a > DEAD_LEFT) {
    // In dead zone — clamp to nearest edge based on approach direction
    // If prev angle was on the min side (left, angles > 90), clamp to START_DEG side → DEAD_LEFT
    // If prev angle was on the max side (right, angles < 90), clamp to END_DEG side → DEAD_RIGHT
    if (prev >= DEAD_RIGHT || prev >= 0) {
      // Was on the max side or upper half, clamp to max
      return DEAD_RIGHT;
    } else {
      // Was on the min side (deep negative), clamp to min
      return DEAD_LEFT;
    }
  }

  // Map angles below -135 into the equivalent positive range for our arc
  // Our arc goes: 225° → 135° → 45° → -45°
  // Which in [-180,180] is: 225→180 wraps to -180→-135 for the last bit
  // So -180..-135 should map the same as 180..225
  if (a < DEAD_LEFT) {
    // This is in the range -180..-135, which corresponds to 180..225 in our arc
    a += 360; // maps to 180..225
  }

  // Clamp to arc bounds
  return Math.max(END_DEG, Math.min(START_DEG, a));
}

function onPointerDown(e: PointerEvent) {
  if (!svgRef.value) return;
  isDragging.value = true;
  (e.target as Element).setPointerCapture(e.pointerId);

  const rawAngle = getPointerAngle(e);
  prevAngle = normalizeToArc(rawAngle, currentAngle.value);
  const val = angleToValue(prevAngle);
  localValue.value = val;
  scheduleUpdate(val);
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return;

  const rawAngle = getPointerAngle(e);
  let angle = normalizeToArc(rawAngle, prevAngle);

  // Angular velocity damping: clamp max change per event
  const delta = angle - prevAngle;
  if (Math.abs(delta) > MAX_ANGLE_STEP) {
    angle = prevAngle + Math.sign(delta) * MAX_ANGLE_STEP;
    // Re-clamp after damping
    angle = Math.max(END_DEG, Math.min(START_DEG, angle));
  }

  prevAngle = angle;
  const val = angleToValue(angle);
  localValue.value = val;
  scheduleUpdate(val);
}

async function onPointerUp(e: PointerEvent) {
  if (!isDragging.value) return;
  (e.target as Element).releasePointerCapture(e.pointerId);

  // Final immediate send — keep isDragging true until API confirms
  if (debounceTimer) clearTimeout(debounceTimer);
  try {
    await deviceStore.setCapabilityValue(
      props.widget.config.deviceId,
      props.widget.config.capabilityId,
      toApiValue(localValue.value),
    );
  } finally {
    isDragging.value = false;
  }
}

function scheduleUpdate(val: number) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    deviceStore.setCapabilityValue(
      props.widget.config.deviceId,
      props.widget.config.capabilityId,
      toApiValue(val),
    );
  }, 200);
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="knob-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="knob-body">
      <svg
        ref="svgRef"
        viewBox="0 0 200 200"
        class="knob-svg"
        :class="{ dragging: isDragging }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <!-- Tick marks -->
        <line
          v-for="(t, i) in ticks"
          :key="i"
          :x1="t.inner.x" :y1="t.inner.y"
          :x2="t.outer.x" :y2="t.outer.y"
          stroke="var(--text-secondary)"
          :stroke-width="t.major ? 2 : 1"
          stroke-linecap="round"
          :opacity="t.major ? 0.3 : 0.15"
        />
        <!-- Background track arc -->
        <path
          :d="bgArc"
          fill="none"
          stroke="var(--border)"
          :stroke-width="TRACK_STROKE"
          stroke-linecap="round"
        />
        <!-- Value arc on track -->
        <path
          v-if="valueArc"
          :d="valueArc"
          fill="none"
          stroke="var(--accent)"
          :stroke-width="TRACK_STROKE"
          stroke-linecap="round"
          :class="{ 'arc-glow': isDragging }"
        />
        <!-- Knob body -->
        <circle
          :cx="CX" :cy="CY" :r="R_BODY"
          class="knob-body-fill"
        />
        <circle
          :cx="CX" :cy="CY" :r="R_BODY"
          fill="none"
          stroke="var(--border)"
          stroke-width="1.5"
          opacity="0.5"
        />
        <!-- Indicator notch line -->
        <line
          :x1="notchInner.x" :y1="notchInner.y"
          :x2="notchOuter.x" :y2="notchOuter.y"
          stroke="var(--accent)"
          stroke-width="4"
          stroke-linecap="round"
        />
        <!-- Center value display -->
        <text
          :x="CX"
          :y="CY - 4"
          text-anchor="middle"
          dominant-baseline="central"
          class="knob-value-text"
        >
          {{ displayValue }}
        </text>
        <text
          v-if="unit"
          :x="CX"
          :y="CY + 20"
          text-anchor="middle"
          dominant-baseline="central"
          class="knob-unit-text"
        >
          {{ unit }}
        </text>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.knob-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.knob-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.knob-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.knob-svg {
  width: 100%;
  height: 100%;
  max-width: 260px;
  max-height: 260px;
  touch-action: none;
  cursor: grab;
  aspect-ratio: 1;
}

.knob-svg.dragging {
  cursor: grabbing;
}

.knob-body-fill {
  fill: var(--bg-secondary);
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.arc-glow {
  filter: drop-shadow(0 0 6px var(--accent));
}

.knob-value-text {
  font-size: 30px;
  font-weight: 700;
  fill: var(--text-primary);
}

.knob-unit-text {
  font-size: 14px;
  fill: var(--text-secondary);
  font-weight: 500;
}
</style>
