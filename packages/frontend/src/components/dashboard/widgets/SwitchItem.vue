<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";
import type { WidgetDeviceRef, SwitchDisplayMode, SwitchSize, SwitchLabelPosition } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import { Icon } from "@iconify/vue";
import { resolveIconName } from "../../../utils/iconResolver";

const props = withDefaults(defineProps<{
  deviceRef: WidgetDeviceRef;
  displayMode?: SwitchDisplayMode;
  size?: SwitchSize;
  hideLabel?: boolean;
  labelPosition?: SwitchLabelPosition;
}>(), {
  displayMode: "button",
  size: "medium",
  hideLabel: false,
  labelPosition: "right",
});

const deviceStore = useDeviceStore();

const device = computed(() => deviceStore.devices[props.deviceRef.deviceId]);
const capability = computed(() => device.value?.capabilities[props.deviceRef.capabilityId]);
const sliderCapId = computed(() => props.deviceRef.sliderCapabilityId ?? "dim");
const sliderCapability = computed(() => device.value?.capabilities[sliderCapId.value]);
const hasSlider = computed(() => props.displayMode === "button" && !!sliderCapability.value?.setable);
const isOn = computed(() => !!capability.value?.value);
const name = computed(() => device.value ? deviceStore.getDeviceName(props.deviceRef.deviceId) : "Unavailable");

const showLabel = computed(() => !props.hideLabel && props.labelPosition !== "hidden");
const effectiveLabelPos = computed(() => props.labelPosition ?? "right");
const iconName = computed(() => resolveIconName(props.deviceRef.icon));

const sliderMin = computed(() => sliderCapability.value?.min ?? 0);
const sliderMax = computed(() => sliderCapability.value?.max ?? 1);

const currentSliderValue = computed(() => {
  const v = sliderCapability.value?.value;
  return typeof v === "number" ? v : sliderMax.value;
});

// Slider state (button mode only)
const sliding = ref(false);
const sliderValue = ref(0);
const btnEl = ref<HTMLElement | null>(null);

let pressTimer: ReturnType<typeof setTimeout> | null = null;
let didSlide = false;

function onPointerDown(e: PointerEvent) {
  if (!capability.value || props.displayMode === "toggle") return;
  didSlide = false;

  if (!hasSlider.value) return;

  pressTimer = setTimeout(() => {
    didSlide = true;
    sliderValue.value = currentSliderValue.value;
    sliding.value = true;
    btnEl.value?.setPointerCapture(e.pointerId);
  }, 400);
}

function onPointerMove(e: PointerEvent) {
  if (!sliding.value || !btnEl.value) return;

  const rect = btnEl.value.getBoundingClientRect();
  const ratio = 1 - (e.clientY - rect.top) / rect.height;
  const clamped = Math.max(0, Math.min(1, ratio));
  sliderValue.value = sliderMin.value + clamped * (sliderMax.value - sliderMin.value);
}

function onPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }

  if (sliding.value) {
    const step = sliderCapability.value?.step;
    let val = sliderValue.value;
    if (step && step > 0) {
      val = Math.round(val / step) * step;
    } else {
      val = Math.round(val * 100) / 100;
    }
    val = Math.max(sliderMin.value, Math.min(sliderMax.value, val));
    deviceStore.setCapabilityValue(props.deviceRef.deviceId, sliderCapId.value, val);
    sliding.value = false;
    return;
  }

  if (!didSlide) {
    toggle();
  }
}

function onPointerCancel() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  sliding.value = false;
}

async function toggle() {
  if (!capability.value) return;
  await deviceStore.setCapabilityValue(
    props.deviceRef.deviceId,
    props.deviceRef.capabilityId,
    !capability.value.value
  );
}

const sliderPercent = computed(() => {
  const range = sliderMax.value - sliderMin.value;
  if (range <= 0) return 100;
  return Math.round(((sliderValue.value - sliderMin.value) / range) * 100);
});

onBeforeUnmount(() => {
  if (pressTimer) clearTimeout(pressTimer);
});
</script>

<template>
  <!-- Toggle mode -->
  <div
    v-if="displayMode === 'toggle'"
    class="toggle-row"
    :class="[`sz-${size}`, `lbl-${effectiveLabelPos}`, { unavailable: !device }]"
    @click="toggle"
  >
    <span v-if="showLabel && effectiveLabelPos === 'above'" class="toggle-label">{{ name }}</span>
    <div class="toggle-track" :class="{ on: isOn }">
      <div class="toggle-thumb" />
    </div>
    <span v-if="showLabel && effectiveLabelPos === 'right'" class="toggle-label">{{ name }}</span>
    <span v-if="showLabel && effectiveLabelPos === 'below'" class="toggle-label">{{ name }}</span>
  </div>

  <!-- Button mode (original) -->
  <div
    v-else
    ref="btnEl"
    class="power-btn"
    :class="[`sz-${size}`, { on: isOn, unavailable: !device, sliding }]"
    :aria-label="`Toggle ${name}`"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @contextmenu.prevent
  >
    <!-- Brightness fill overlay -->
    <div
      v-if="sliding"
      class="dim-fill"
      :style="{ height: sliderPercent + '%' }"
    />

    <template v-if="sliding">
      <span class="dim-value">{{ sliderPercent }}%</span>
    </template>
    <template v-else>
      <Icon v-if="iconName" :icon="iconName" class="power-icon" />
      <svg v-else class="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="2" x2="12" y2="12" />
        <path d="M16.24 7.76a6 6 0 1 1-8.49 0" />
      </svg>
      <span v-if="showLabel" class="power-label">{{ name }}</span>
      <svg v-if="hasSlider" class="dim-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    </template>
  </div>
</template>

<style scoped>
/* ============================================================
   BUTTON MODE
   ============================================================ */
.power-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 10px 6px;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.2s;
  user-select: none;
  touch-action: none;
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.power-btn:hover:not(.sliding) {
  border-color: var(--text-secondary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.power-btn.on {
  border-color: rgba(79, 195, 247, 0.6);
  color: var(--accent);
  background: rgba(79, 195, 247, 0.12);
  box-shadow:
    0 0 20px rgba(79, 195, 247, 0.3),
    0 0 40px rgba(79, 195, 247, 0.1),
    inset 0 0 16px rgba(79, 195, 247, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.power-btn.sliding {
  border-color: var(--accent);
  cursor: ns-resize;
}

.power-btn.unavailable {
  opacity: 0.35;
  pointer-events: none;
}

.dim-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(79, 195, 247, 0.2);
  border-radius: 0 0 8px 8px;
  transition: none;
  pointer-events: none;
}

.dim-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent);
  z-index: 1;
}

.power-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.power-label {
  font-size: 0.7rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
}

.dim-indicator {
  width: 14px;
  height: 14px;
  opacity: 0.4;
  flex-shrink: 0;
}

/* Button sizes */
.power-btn.sz-small {
  padding: 6px 4px;
  gap: 3px;
}
.power-btn.sz-small .power-icon {
  width: 18px;
  height: 18px;
}
.power-btn.sz-small .power-label {
  font-size: 0.6rem;
}
.power-btn.sz-small .dim-indicator {
  width: 10px;
  height: 10px;
}
.power-btn.sz-small .dim-value {
  font-size: 0.9rem;
}

.power-btn.sz-large {
  padding: 14px 10px;
  gap: 10px;
}
.power-btn.sz-large .power-icon {
  width: 42px;
  height: 42px;
}
.power-btn.sz-large .power-label {
  font-size: 0.95rem;
}
.power-btn.sz-large .dim-indicator {
  width: 18px;
  height: 18px;
}
.power-btn.sz-large .dim-value {
  font-size: 1.6rem;
}

/* ============================================================
   TOGGLE MODE
   ============================================================ */
.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

.toggle-row.unavailable {
  opacity: 0.35;
  pointer-events: none;
}

/* Label position: above / below → stack vertically */
.toggle-row.lbl-above,
.toggle-row.lbl-below {
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* --- Toggle: small (was the old medium) --- */
.toggle-track {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--border);
  transition: background 0.25s;
  flex-shrink: 0;
}

.toggle-track.on {
  background: var(--accent);
  box-shadow: 0 0 12px rgba(79, 195, 247, 0.4);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.25s;
}

.toggle-track.on .toggle-thumb {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* --- Toggle small --- */
.toggle-row.sz-small .toggle-track {
  width: 56px;
  height: 30px;
  border-radius: 15px;
}
.toggle-row.sz-small .toggle-thumb {
  width: 26px;
  height: 26px;
}
.toggle-row.sz-small .toggle-track.on .toggle-thumb {
  transform: translateX(26px);
}
.toggle-row.sz-small .toggle-label {
  font-size: 0.85rem;
}

/* --- Toggle medium --- */
.toggle-row.sz-medium .toggle-track {
  width: 76px;
  height: 40px;
  border-radius: 20px;
}
.toggle-row.sz-medium .toggle-thumb {
  top: 3px;
  left: 3px;
  width: 34px;
  height: 34px;
}
.toggle-row.sz-medium .toggle-track.on .toggle-thumb {
  transform: translateX(36px);
}
.toggle-row.sz-medium .toggle-label {
  font-size: 1.1rem;
}
.toggle-row.sz-medium {
  gap: 12px;
}

/* --- Toggle large --- */
.toggle-row.sz-large .toggle-track {
  width: 100px;
  height: 52px;
  border-radius: 26px;
}
.toggle-row.sz-large .toggle-thumb {
  top: 4px;
  left: 4px;
  width: 44px;
  height: 44px;
}
.toggle-row.sz-large .toggle-track.on .toggle-thumb {
  transform: translateX(48px);
}
.toggle-row.sz-large .toggle-label {
  font-size: 1.4rem;
}
.toggle-row.sz-large {
  gap: 16px;
}
</style>
