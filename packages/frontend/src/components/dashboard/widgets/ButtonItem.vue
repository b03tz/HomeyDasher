<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { ButtonFlowRef } from "@homecontrol/shared";

const props = defineProps<{
  flowRef: ButtonFlowRef;
}>();

const firing = ref(false);
const flowName = ref("");

onMounted(async () => {
  if (props.flowRef.label) return;
  try {
    const res = await fetch("/api/flows");
    const data = await res.json() as Record<string, { id: string; name: string }>;
    const flow = Object.values(data).find(f => f.id === props.flowRef.flowId);
    if (flow) flowName.value = flow.name;
  } catch {
    // ignore
  }
});

const displayName = computed(() => props.flowRef.label || flowName.value || "Flow");

async function triggerFlow() {
  if (firing.value) return;
  firing.value = true;
  try {
    await fetch(`/api/flows/${props.flowRef.flowId}/trigger`, { method: "POST" });
  } catch {
    // ignore
  } finally {
    setTimeout(() => { firing.value = false; }, 600);
  }
}
</script>

<template>
  <div
    class="flow-btn"
    :class="{ firing }"
    :style="flowRef.color ? { '--btn-color': flowRef.color } : {}"
    @click="triggerFlow"
  >
    <svg class="play-icon" viewBox="0 0 24 24">
      <polygon points="7 4 20 12 7 20" fill="currentColor" />
    </svg>
    <span class="flow-label">{{ displayName }}</span>
  </div>
</template>

<style scoped>
.flow-btn {
  --btn-color: var(--accent);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 10px 6px;
  border: 2px solid var(--btn-color);
  border-radius: 10px;
  background: color-mix(in srgb, var(--btn-color) 8%, transparent);
  color: var(--btn-color);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  user-select: none;
  touch-action: none;
  overflow: hidden;
}

.flow-btn:hover {
  background: color-mix(in srgb, var(--btn-color) 15%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--btn-color) 25%, transparent);
}

.flow-btn:active,
.flow-btn.firing {
  transform: scale(0.95);
}

.flow-btn.firing {
  animation: btn-pulse 0.6s ease-out;
}

.play-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  margin-left: 3px; /* optical centering — triangle visually leans left */
}

.flow-label {
  font-size: 0.7rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
}

@keyframes btn-pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--btn-color) 50%, transparent); }
  100% { box-shadow: 0 0 0 20px color-mix(in srgb, var(--btn-color) 0%, transparent); }
}
</style>
