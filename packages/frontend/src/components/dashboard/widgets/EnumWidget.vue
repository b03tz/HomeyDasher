<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import type { EnumWidget as EnumWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: EnumWidgetType;
}>();

const deviceStore = useDeviceStore();

const device = computed(() => deviceStore.devices[props.widget.config.deviceId]);
const capability = computed(() => device.value?.capabilities[props.widget.config.capabilityId]);
const enumValues = computed(() => capability.value?.values ?? []);
const liveValue = computed(() => capability.value?.value as string);

const localValue = ref(liveValue.value);
const isInteracting = ref(false);

watch(liveValue, (v) => {
  if (!isInteracting.value) localValue.value = v;
});

const currentLabel = computed(() => {
  const match = enumValues.value.find((e) => e.id === localValue.value);
  return match?.title ?? localValue.value ?? "—";
});

const displayMode = computed(() => props.widget.config.displayMode ?? "popup");

// --- Popup mode ---
const popoverOpen = ref(false);
const triggerEl = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});

function positionPopover() {
  if (!triggerEl.value) return;
  const rect = triggerEl.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const maxH = 180;
  const openAbove = spaceBelow < maxH && spaceAbove > spaceBelow;

  popoverStyle.value = {
    position: "fixed",
    left: `${rect.left + rect.width / 2}px`,
    transform: "translateX(-50%)",
    minWidth: `${Math.max(rect.width, 120)}px`,
    maxHeight: `${maxH}px`,
    ...(openAbove
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` }),
  };
}

async function togglePopover() {
  popoverOpen.value = !popoverOpen.value;
  if (popoverOpen.value) {
    await nextTick();
    positionPopover();
  }
}

async function selectValue(id: string) {
  localValue.value = id;
  popoverOpen.value = false;
  await deviceStore.setCapabilityValue(props.widget.config.deviceId, props.widget.config.capabilityId, id);
}

function onClickOutside(e: MouseEvent) {
  if (triggerEl.value && triggerEl.value.contains(e.target as Node)) return;
  popoverOpen.value = false;
}

onMounted(() => document.addEventListener("pointerdown", onClickOutside));
onUnmounted(() => document.removeEventListener("pointerdown", onClickOutside));

// --- Scroll picker mode ---
const scrollContainer = ref<HTMLElement | null>(null);
const ITEM_HEIGHT = 36;

function scrollToIndex(idx: number, smooth = false) {
  if (!scrollContainer.value) return;
  const top = idx * ITEM_HEIGHT;
  scrollContainer.value.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}

// Sync scroll position when liveValue changes
watch(liveValue, () => {
  if (isInteracting.value) return;
  const idx = enumValues.value.findIndex((e) => e.id === liveValue.value);
  if (idx >= 0) nextTick(() => scrollToIndex(idx));
});

onMounted(() => {
  if (displayMode.value === "scroll") {
    const idx = enumValues.value.findIndex((e) => e.id === liveValue.value);
    if (idx >= 0) nextTick(() => scrollToIndex(idx));
  }
});

let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;

function onScrollStart() {
  isInteracting.value = true;
}

function onScroll() {
  if (scrollEndTimer) clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(() => {
    commitScroll();
  }, 150);
}

async function commitScroll() {
  if (!scrollContainer.value) return;
  const idx = Math.round(scrollContainer.value.scrollTop / ITEM_HEIGHT);
  const clamped = Math.max(0, Math.min(idx, enumValues.value.length - 1));
  const val = enumValues.value[clamped];
  if (val && val.id !== liveValue.value) {
    localValue.value = val.id;
    await deviceStore.setCapabilityValue(props.widget.config.deviceId, props.widget.config.capabilityId, val.id);
  }
  isInteracting.value = false;
}
</script>

<template>
  <div class="enum-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />

    <!-- Popup mode -->
    <div v-if="displayMode === 'popup'" class="enum-popup-body">
      <button ref="triggerEl" class="enum-current" @pointerdown.stop @click="togglePopover">
        {{ currentLabel }}
        <svg class="chevron" :class="{ open: popoverOpen }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <Teleport to="body">
        <div v-if="popoverOpen" class="enum-popover" :style="popoverStyle">
          <button
            v-for="opt in enumValues"
            :key="opt.id"
            class="enum-option"
            :class="{ active: opt.id === localValue }"
            @mousedown.prevent="selectValue(opt.id)"
          >
            {{ opt.title }}
          </button>
        </div>
      </Teleport>
    </div>

    <!-- Scroll picker mode -->
    <div v-else class="enum-scroll-body">
      <div class="scroll-highlight" />
      <div
        ref="scrollContainer"
        class="scroll-container"
        @pointerdown="onScrollStart"
        @scroll="onScroll"
      >
        <div class="scroll-spacer" />
        <div
          v-for="(opt, i) in enumValues"
          :key="opt.id"
          class="scroll-item"
          :class="{ selected: opt.id === localValue }"
        >
          {{ opt.title }}
        </div>
        <div class="scroll-spacer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.enum-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: visible;
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.enum-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

/* --- Popup mode --- */
.enum-popup-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  min-height: 0;
}

.enum-current {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.enum-current:active {
  background: var(--border);
}

.chevron {
  flex-shrink: 0;
  transition: transform 0.15s ease;
}
.chevron.open {
  transform: rotate(180deg);
}


/* --- Scroll picker mode --- */
.enum-scroll-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.scroll-highlight {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 50%;
  height: 36px;
  transform: translateY(-50%);
  background: rgba(79, 195, 247, 0.08);
  border: 1px solid var(--accent);
  border-radius: 6px;
  pointer-events: none;
  z-index: 1;
}

.scroll-container {
  width: 100%;
  height: calc(36px * 3); /* show 3 items */
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  -ms-overflow-style: none;
  scrollbar-width: none;
  position: relative;
  z-index: 2;
}

.scroll-container::-webkit-scrollbar {
  display: none;
}

.scroll-spacer {
  height: 36px; /* one item height for top/bottom padding */
  flex-shrink: 0;
}

.scroll-item {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.5;
  scroll-snap-align: center;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
  transition: opacity 0.15s, font-size 0.15s, color 0.15s;
}

.scroll-item.selected {
  color: var(--accent);
  font-weight: 600;
  font-size: 0.95rem;
  opacity: 1;
}
</style>

<style>
.enum-popover {
  z-index: 9999;
  overflow-y: auto;
  background: rgba(15, 25, 45, 0.92);
  border: 1px solid rgba(79, 195, 247, 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(79, 195, 247, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.enum-option {
  padding: 7px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}

.enum-option:hover {
  background: var(--bg-secondary);
}

.enum-option.active {
  color: var(--accent);
  font-weight: 600;
}
</style>
