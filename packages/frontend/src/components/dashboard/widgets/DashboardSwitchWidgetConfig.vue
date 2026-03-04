<script setup lang="ts">
import { computed } from "vue";
import { useDashboardStore } from "../../../stores/dashboard";

const props = defineProps<{
  targetDashboardId: string;
}>();

const emit = defineEmits<{
  "update:targetDashboardId": [value: string];
}>();

const dashboardStore = useDashboardStore();

const otherDashboards = computed(() =>
  dashboardStore.dashboards.filter((d) => d.id !== dashboardStore.activeDashboardId)
);
</script>

<template>
  <div class="dashboard-switch-config">
    <label class="field-label">Target Dashboard</label>
    <select
      class="select-input"
      :value="targetDashboardId"
      @change="emit('update:targetDashboardId', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Select a dashboard...</option>
      <option
        v-for="db in otherDashboards"
        :key="db.id"
        :value="db.id"
      >
        {{ db.name }}
      </option>
    </select>
    <p v-if="otherDashboards.length === 0" class="hint">
      No other dashboards available. Create one in Settings first.
    </p>
  </div>
</template>

<style scoped>
.dashboard-switch-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.select-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.select-input:focus {
  border-color: var(--accent);
}

.hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
