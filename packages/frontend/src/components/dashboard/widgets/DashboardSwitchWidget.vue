<script setup lang="ts">
import { computed } from "vue";
import type { DashboardSwitchWidget } from "@homecontrol/shared";
import { useDashboardStore } from "../../../stores/dashboard";
import { resolveIcon } from "../../../utils/iconResolver";
import { LayoutDashboard } from "lucide-vue-next";

const props = defineProps<{ widget: DashboardSwitchWidget }>();
const dashboardStore = useDashboardStore();

const targetDashboard = computed(() =>
  dashboardStore.dashboards.find((d) => d.id === props.widget.config.targetDashboardId)
);

const iconComponent = computed(() => {
  const name = targetDashboard.value?.icon;
  if (!name) return LayoutDashboard;
  return resolveIcon(name) || LayoutDashboard;
});

async function handleClick() {
  if (dashboardStore.editMode) return;
  if (!targetDashboard.value) return;
  await dashboardStore.switchDashboard(props.widget.config.targetDashboardId);
}
</script>

<template>
  <div class="dashboard-switch-widget" @click="handleClick">
    <div class="switch-icon">
      <component :is="iconComponent" :size="24" />
    </div>
    <div class="switch-info">
      <span v-if="!widget.hideTitle" class="switch-title">{{ widget.title }}</span>
      <span class="switch-target">{{ targetDashboard?.name ?? "Unknown" }}</span>
    </div>
  </div>
</template>

<style scoped>
.dashboard-switch-widget {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-card);
  border-radius: var(--radius);
  height: 100%;
  cursor: pointer;
  transition: background 0.15s;
}

.dashboard-switch-widget:hover {
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-card));
}

.switch-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-secondary));
  color: var(--accent);
  flex-shrink: 0;
}

.switch-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.switch-title {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.switch-target {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
