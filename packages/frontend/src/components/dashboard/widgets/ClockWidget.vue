<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { ClockWidget as ClockWidgetType } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: ClockWidgetType;
}>();

const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  const interval = props.widget.config.showSeconds ? 1000 : 60000;
  timer = setInterval(() => { now.value = new Date(); }, interval);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

const hours = computed(() => now.value.getHours());
const minutes = computed(() => now.value.getMinutes());
const seconds = computed(() => now.value.getSeconds());

const showTime = computed(() =>
  props.widget.config.display === "time" || props.widget.config.display === "both"
);
const showDate = computed(() =>
  props.widget.config.display === "date" || props.widget.config.display === "both"
);

// Digital time string
const timeString = computed(() => {
  const h = props.widget.config.use24Hour !== false ? hours.value : (hours.value % 12 || 12);
  const hh = h.toString().padStart(2, "0");
  const mm = minutes.value.toString().padStart(2, "0");
  if (props.widget.config.showSeconds) {
    const ss = seconds.value.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}`;
});

const amPm = computed(() => {
  if (props.widget.config.use24Hour !== false) return "";
  return hours.value >= 12 ? " PM" : " AM";
});

const dateString = computed(() => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const d = now.value;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
});

// Analog clock angles
const hourAngle = computed(() => {
  const h = hours.value % 12;
  return (h * 30) + (minutes.value * 0.5);
});
const minuteAngle = computed(() => minutes.value * 6);
const secondAngle = computed(() => seconds.value * 6);

const isAnalog = computed(() => props.widget.config.style === "analog");
</script>

<template>
  <div class="clock-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="clock-body">
      <!-- Analog clock -->
      <template v-if="isAnalog">
        <svg viewBox="0 0 100 100" class="clock-svg">
          <!-- Face -->
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" stroke-width="2" />
          <!-- Tick marks -->
          <line
            v-for="i in 12"
            :key="'tick-' + i"
            :x1="50 + 38 * Math.cos(((i * 30 - 90) * Math.PI) / 180)"
            :y1="50 + 38 * Math.sin(((i * 30 - 90) * Math.PI) / 180)"
            :x2="50 + 42 * Math.cos(((i * 30 - 90) * Math.PI) / 180)"
            :y2="50 + 42 * Math.sin(((i * 30 - 90) * Math.PI) / 180)"
            stroke="var(--text-secondary)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- Hour hand -->
          <line
            x1="50" y1="50"
            :x2="50 + 22 * Math.cos(((hourAngle - 90) * Math.PI) / 180)"
            :y2="50 + 22 * Math.sin(((hourAngle - 90) * Math.PI) / 180)"
            stroke="var(--text-primary)"
            stroke-width="3"
            stroke-linecap="round"
          />
          <!-- Minute hand -->
          <line
            x1="50" y1="50"
            :x2="50 + 32 * Math.cos(((minuteAngle - 90) * Math.PI) / 180)"
            :y2="50 + 32 * Math.sin(((minuteAngle - 90) * Math.PI) / 180)"
            stroke="var(--text-primary)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- Second hand -->
          <line
            v-if="widget.config.showSeconds"
            x1="50" y1="50"
            :x2="50 + 35 * Math.cos(((secondAngle - 90) * Math.PI) / 180)"
            :y2="50 + 35 * Math.sin(((secondAngle - 90) * Math.PI) / 180)"
            stroke="var(--accent)"
            stroke-width="1"
            stroke-linecap="round"
          />
          <!-- Center dot -->
          <circle cx="50" cy="50" r="2.5" fill="var(--text-primary)" />
        </svg>
        <span v-if="showDate" class="analog-date">{{ dateString }}</span>
      </template>

      <!-- Digital clock -->
      <template v-else>
        <span v-if="showTime" class="digital-time">{{ timeString }}{{ amPm }}</span>
        <span v-if="showDate" class="digital-date">{{ dateString }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.clock-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.clock-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 0;
}

.clock-svg {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 1;
}

.analog-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.digital-time {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.digital-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
