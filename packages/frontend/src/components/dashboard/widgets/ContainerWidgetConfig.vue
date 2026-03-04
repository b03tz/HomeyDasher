<script setup lang="ts">
defineProps<{
  gridColumns: number;
  gridRows: number;
  childCount: number;
}>();

const emit = defineEmits<{
  "update:gridColumns": [v: number];
  "update:gridRows": [v: number];
  editContents: [];
}>();

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
</script>

<template>
  <div class="container-config">
    <label class="config-label">Grid columns ({{ gridColumns }})</label>
    <div class="stepper">
      <button class="step-btn" :disabled="gridColumns <= 2" @click="emit('update:gridColumns', clamp(gridColumns - 1, 2, 8))">-</button>
      <div class="step-track">
        <div v-for="i in 7" :key="i" class="step-dot" :class="{ active: i + 1 <= gridColumns }" @click="emit('update:gridColumns', i + 1)" />
      </div>
      <button class="step-btn" :disabled="gridColumns >= 8" @click="emit('update:gridColumns', clamp(gridColumns + 1, 2, 8))">+</button>
    </div>

    <label class="config-label">Grid rows ({{ gridRows }})</label>
    <div class="stepper">
      <button class="step-btn" :disabled="gridRows <= 1" @click="emit('update:gridRows', clamp(gridRows - 1, 1, 8))">-</button>
      <div class="step-track">
        <div v-for="i in 8" :key="i" class="step-dot" :class="{ active: i <= gridRows }" @click="emit('update:gridRows', i)" />
      </div>
      <button class="step-btn" :disabled="gridRows >= 8" @click="emit('update:gridRows', clamp(gridRows + 1, 1, 8))">+</button>
    </div>

    <button class="edit-contents-btn" @click="emit('editContents')">
      Edit Contents
      <span v-if="childCount > 0" class="child-badge">{{ childCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.container-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }

.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-btn {
  width: 32px; height: 32px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.step-track {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.step-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.step-dot.active {
  background: var(--accent);
  border-color: var(--accent);
}

.edit-contents-btn {
  margin-top: 8px;
  padding: 10px 16px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: rgba(79, 195, 247, 0.1);
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s;
}

.edit-contents-btn:hover {
  background: rgba(79, 195, 247, 0.2);
}

.child-badge {
  background: var(--accent);
  color: #000;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}
</style>
