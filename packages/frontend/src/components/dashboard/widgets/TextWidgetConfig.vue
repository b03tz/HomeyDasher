<script setup lang="ts">
defineProps<{
  content: string;
  html: boolean;
}>();

const emit = defineEmits<{
  "update:content": [v: string];
  "update:html": [v: boolean];
}>();
</script>

<template>
  <div class="text-config">
    <label class="config-label">Content</label>
    <textarea
      :value="content"
      class="text-area"
      :class="{ mono: html }"
      placeholder="Enter text or HTML content... (leave empty for spacer)"
      rows="6"
      @input="emit('update:content', ($event.target as HTMLTextAreaElement).value)"
    />

    <label class="checkbox-row">
      <input
        type="checkbox"
        :checked="html"
        @change="emit('update:html', ($event.target as HTMLInputElement).checked)"
      />
      <span>Enable HTML</span>
    </label>

    <p v-if="html" class="info-note">
      Content will render in an isolated iframe with script support.
    </p>
  </div>
</template>

<style scoped>
.text-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }

.text-area {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.text-area.mono {
  font-family: "Consolas", "Monaco", monospace;
  font-size: 0.8rem;
}

.checkbox-row {
  display: flex; align-items: center; gap: 8px; font-size: 0.85rem;
  color: var(--text-primary); cursor: pointer;
}
.checkbox-row input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }

.info-note {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
