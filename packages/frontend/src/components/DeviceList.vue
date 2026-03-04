<script setup lang="ts">
import type { HomeyDevice } from "@homecontrol/shared";
import DeviceCard from "./DeviceCard.vue";

defineProps<{
  devices: HomeyDevice[];
  zoneName: string;
}>();
</script>

<template>
  <section class="zone-section">
    <h2 class="zone-title">{{ zoneName }}</h2>
    <div class="device-grid">
      <DeviceCard v-for="device in devices" :key="device.id" :device="device" />
    </div>
  </section>
</template>

<style scoped>
.zone-section {
  margin-bottom: 24px;
}

.zone-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--accent);
  padding-left: 4px;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
</style>
