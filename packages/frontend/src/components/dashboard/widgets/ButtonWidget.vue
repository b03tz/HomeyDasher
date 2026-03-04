<script setup lang="ts">
import { ref } from "vue";
import type { ButtonWidget as ButtonWidgetType } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: ButtonWidgetType;
}>();

const firing = ref(false);

async function triggerFlow() {
  if (firing.value) return;
  firing.value = true;
  try {
    await fetch(`/api/flows/${props.widget.config.flowId}/trigger`, { method: "POST" });
  } catch {
    // ignore
  } finally {
    setTimeout(() => { firing.value = false; }, 600);
  }
}
</script>

<template>
  <div class="button-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="button-body">
      <button
        class="flow-button"
        :class="{ firing }"
        :style="widget.config.color ? { '--btn-color': widget.config.color } : {}"
        @click="triggerFlow"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="play-icon">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.button-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.button-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.flow-button {
  --btn-color: var(--accent);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--btn-color);
  background: rgba(79, 195, 247, 0.1);
  color: var(--btn-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}

.flow-button:hover {
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(79, 195, 247, 0.3);
}

.flow-button:active,
.flow-button.firing {
  transform: scale(0.95);
}

.flow-button.firing {
  animation: pulse 0.6s ease-out;
}

.play-icon {
  width: 28px;
  height: 28px;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(79, 195, 247, 0.5); }
  100% { box-shadow: 0 0 0 20px rgba(79, 195, 247, 0); }
}
</style>
