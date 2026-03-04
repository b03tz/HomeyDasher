<script setup lang="ts">
import { computed } from "vue";
import type { TextWidget as TextWidgetType } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: TextWidgetType;
}>();

const iframeSrcdoc = computed(() => {
  const reset = '<style>body{margin:0;padding:0;overflow:hidden;}</style>';
  return reset + (props.widget.config.content ?? '');
});
</script>

<template>
  <div class="text-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="text-body">
      <template v-if="widget.config.content">
        <iframe
          v-if="widget.config.html"
          :srcdoc="iframeSrcdoc"
          sandbox="allow-scripts allow-same-origin"
          class="text-iframe"
        />
        <p v-else class="text-plain">{{ widget.config.content }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.text-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.text-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.text-plain {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
}
</style>
