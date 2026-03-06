<script setup lang="ts">
import { ref, computed } from "vue";
import { useDeviceStore } from "../../../stores/devices";
import ImagePicker from "../ImagePicker.vue";

const props = defineProps<{
  deviceId: string;
  capabilityId: string;
  onImage: string;
  offImage: string;
  chromeless: boolean;
}>();

const emit = defineEmits<{
  "update:deviceId": [value: string];
  "update:capabilityId": [value: string];
  "update:onImage": [value: string];
  "update:offImage": [value: string];
  "update:chromeless": [value: boolean];
}>();

const deviceStore = useDeviceStore();

const devices = computed(() =>
  Object.values(deviceStore.devices).sort((a, b) => a.name.localeCompare(b.name))
);

const booleanCapabilities = computed(() => {
  const device = deviceStore.devices[props.deviceId];
  if (!device) return [];
  return Object.values(device.capabilities).filter(
    (c) => c.type === "boolean" && c.setable
  );
});

function onDeviceChange(deviceId: string) {
  emit("update:deviceId", deviceId);
  emit("update:capabilityId", "");
  const device = deviceStore.devices[deviceId];
  if (device) {
    const caps = Object.values(device.capabilities).filter(
      (c) => c.type === "boolean" && c.setable
    );
    if (caps.length === 1) {
      emit("update:capabilityId", caps[0].id);
    } else {
      const onoff = caps.find((c) => c.id === "onoff");
      if (onoff) emit("update:capabilityId", onoff.id);
    }
  }
}

// Image picker state
const pickingTarget = ref<"on" | "off" | null>(null);

function onImagePicked(url: string) {
  if (pickingTarget.value === "on") {
    emit("update:onImage", url);
  } else if (pickingTarget.value === "off") {
    emit("update:offImage", url);
  }
  pickingTarget.value = null;
}
</script>

<template>
  <div class="image-switch-config">
    <label class="config-label">Device</label>
    <select
      class="config-select"
      :value="deviceId"
      @change="onDeviceChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Select a device...</option>
      <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.name }}</option>
    </select>

    <template v-if="deviceId">
      <label class="config-label">Capability</label>
      <select
        class="config-select"
        :value="capabilityId"
        @change="emit('update:capabilityId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>Select a capability...</option>
        <option v-for="c in booleanCapabilities" :key="c.id" :value="c.id">
          {{ c.title }} ({{ c.id }})
        </option>
      </select>
    </template>

    <label class="config-label">Off Image</label>
    <div class="image-row">
      <div v-if="offImage" class="image-thumb">
        <img :src="offImage" alt="Off image" />
      </div>
      <button class="pick-btn" @click="pickingTarget = 'off'">
        {{ offImage ? 'Change' : 'Choose Image' }}
      </button>
      <button v-if="offImage" class="pick-btn" @click="emit('update:offImage', '')">Remove</button>
    </div>

    <label class="config-label">On Image</label>
    <div class="image-row">
      <div v-if="onImage" class="image-thumb">
        <img :src="onImage" alt="On image" />
      </div>
      <button class="pick-btn" @click="pickingTarget = 'on'">
        {{ onImage ? 'Change' : 'Choose Image' }}
      </button>
      <button v-if="onImage" class="pick-btn" @click="emit('update:onImage', '')">Remove</button>
    </div>

    <label class="checkbox-row">
      <input
        type="checkbox"
        class="checkbox-input"
        :checked="chromeless"
        @change="emit('update:chromeless', ($event.target as HTMLInputElement).checked)"
      />
      <span class="checkbox-label">Image only (no border or background)</span>
    </label>

    <ImagePicker
      :open="pickingTarget !== null"
      :model-value="pickingTarget === 'on' ? onImage : offImage"
      @update:model-value="onImagePicked"
      @close="pickingTarget = null"
    />
  </div>
</template>

<style scoped>
.image-switch-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 4px;
}

.config-select {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.85rem;
}

.image-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.image-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pick-btn {
  padding: 4px 12px;
  font-size: 0.8rem;
  min-height: 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.pick-btn:hover {
  border-color: var(--accent);
  background: var(--bg-secondary);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  cursor: pointer;
}

.checkbox-input {
  accent-color: var(--accent);
}

.checkbox-label {
  font-size: 0.85rem;
  color: var(--text-primary);
}
</style>
