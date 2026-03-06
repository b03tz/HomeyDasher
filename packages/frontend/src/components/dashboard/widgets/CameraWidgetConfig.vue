<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  rtspUrl: string;
}>();

const emit = defineEmits<{
  "update:rtspUrl": [value: string];
}>();

const streamAlias = computed(() => {
  const url = props.rtspUrl;
  if (!url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/\./g, "_");
    const port = u.port && u.port !== "554" ? `_${u.port}` : "";
    const path = u.pathname.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    return `cam_${host}${port}${path ? "_" + path : ""}`;
  } catch {
    return "cam_" + url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").slice(0, 60);
  }
});
</script>

<template>
  <div class="camera-config">
    <label class="field-label">
      RTSP URL
      <input
        type="text"
        class="field-input"
        placeholder="rtsp://user:pass@192.168.1.x/stream"
        :value="rtspUrl"
        @input="emit('update:rtspUrl', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <p class="field-hint">
      On save, this stream will be registered with go2rtc as an alias.
      Identical URLs share the same stream.
    </p>
    <p v-if="streamAlias" class="stream-alias">
      Stream alias: <code>{{ streamAlias }}</code>
    </p>
  </div>
</template>

<style scoped>
.camera-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.field-input {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.field-input:focus {
  outline: none;
  border-color: var(--accent);
}

.field-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
  opacity: 0.7;
  margin: 0;
}

.stream-alias {
  font-size: 0.78rem;
  color: var(--accent);
  margin: 0;
}

.stream-alias code {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
}
</style>
