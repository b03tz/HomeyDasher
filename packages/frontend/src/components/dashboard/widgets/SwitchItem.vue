<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";
import type { WidgetDeviceRef } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";

const props = defineProps<{
  deviceRef: WidgetDeviceRef;
}>();

const deviceStore = useDeviceStore();

const device = computed(() => deviceStore.devices[props.deviceRef.deviceId]);
const capability = computed(() => device.value?.capabilities[props.deviceRef.capabilityId]);
const sliderCapId = computed(() => props.deviceRef.sliderCapabilityId ?? "dim");
const sliderCapability = computed(() => device.value?.capabilities[sliderCapId.value]);
const hasSlider = computed(() => !!sliderCapability.value?.setable);
const isOn = computed(() => !!capability.value?.value);
const name = computed(() => device.value?.name ?? "Unavailable");

const sliderMin = computed(() => sliderCapability.value?.min ?? 0);
const sliderMax = computed(() => sliderCapability.value?.max ?? 1);

const currentSliderValue = computed(() => {
  const v = sliderCapability.value?.value;
  return typeof v === "number" ? v : sliderMax.value;
});

// Slider state
const sliding = ref(false);
const sliderValue = ref(0); // 0–1
const btnEl = ref<HTMLElement | null>(null);

let pressTimer: ReturnType<typeof setTimeout> | null = null;
let didSlide = false;

function onPointerDown(e: PointerEvent) {
  if (!capability.value) return;
  didSlide = false;

  if (!hasSlider.value) return;

  pressTimer = setTimeout(() => {
    // Long press triggered — enter slider mode
    didSlide = true;
    sliderValue.value = currentSliderValue.value;
    sliding.value = true;
    // Capture pointer so we track move/up even outside element
    btnEl.value?.setPointerCapture(e.pointerId);
  }, 400);
}

function onPointerMove(e: PointerEvent) {
  if (!sliding.value || !btnEl.value) return;

  const rect = btnEl.value.getBoundingClientRect();
  // Map Y position: top of button = max, bottom = min
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
    // Apply slider value
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

  // Normal tap — toggle
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
  <div
    ref="btnEl"
    class="power-btn"
    :class="{ on: isOn, unavailable: !device, sliding }"
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
      <svg class="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="2" x2="12" y2="12" />
        <path d="M16.24 7.76a6 6 0 1 1-8.49 0" />
      </svg>
      <span class="power-label">{{ name }}</span>
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
  transition: border-color 0.2s, color 0.2s, background 0.2s, box-shadow 0.2s;
  user-select: none;
  touch-action: none;
  overflow: hidden;
}

.power-btn:hover:not(.sliding) {
  border-color: var(--text-secondary);
}

.power-btn.on {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(79, 195, 247, 0.08);
  box-shadow: 0 0 12px rgba(79, 195, 247, 0.15);
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
</style>
