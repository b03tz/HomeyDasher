<script setup lang="ts">
import { computed } from "vue";
import type { ImageSwitchWidget as ImageSwitchWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: ImageSwitchWidgetType;
}>();

const deviceStore = useDeviceStore();

const device = computed(() => deviceStore.devices[props.widget.config.deviceId]);
const capability = computed(() => device.value?.capabilities[props.widget.config.capabilityId]);
const isOn = computed(() => !!capability.value?.value);

const currentImage = computed(() =>
  isOn.value ? props.widget.config.onImage : props.widget.config.offImage
);

async function toggle() {
  if (!capability.value) return;
  await deviceStore.setCapabilityValue(
    props.widget.config.deviceId,
    props.widget.config.capabilityId,
    !capability.value.value
  );
}
</script>

<template>
  <div
    class="image-switch-widget"
    :class="{ chromeless: widget.config.chromeless }"
    @click="toggle"
  >
    <WidgetHeader v-if="!widget.config.chromeless" :title="widget.title" :hidden="widget.hideTitle" />
    <div class="image-container">
      <img
        v-if="currentImage"
        :src="currentImage"
        alt=""
        class="switch-image"
        draggable="false"
      />
      <div v-else class="no-image">No image</div>
    </div>
  </div>
</template>

<style scoped>
.image-switch-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.image-switch-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.image-switch-widget.chromeless {
  background: transparent;
  border: none;
  padding: 0;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
  border-radius: 0;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.image-switch-widget.chromeless:hover,
.image-switch-widget.chromeless:focus,
.image-switch-widget.chromeless:active {
  border: none;
  box-shadow: none;
  outline: none;
  background: transparent;
}

.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
}

.switch-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: opacity 0.2s;
}

.no-image {
  color: var(--text-secondary);
  font-size: 0.8rem;
  opacity: 0.5;
}
</style>
