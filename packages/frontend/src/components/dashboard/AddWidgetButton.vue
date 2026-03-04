<script setup lang="ts">
const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button class="add-widget-btn" @click="emit('click')" aria-label="Add widget">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    <span>Add Widget</span>
  </button>
</template>

<style scoped>
.add-widget-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 24px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.add-widget-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
