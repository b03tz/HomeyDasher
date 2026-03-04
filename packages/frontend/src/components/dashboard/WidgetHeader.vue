<script setup lang="ts">
defineProps<{
  title: string;
  hidden?: boolean;
}>();
</script>

<template>
  <div v-if="!hidden" class="widget-header">
    <span class="widget-title">{{ title }}</span>
  </div>
</template>

<style scoped>
.widget-header {
  text-align: center;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.widget-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
