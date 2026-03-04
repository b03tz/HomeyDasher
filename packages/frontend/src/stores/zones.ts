import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { HomeyZone } from "@homecontrol/shared";

export const useZoneStore = defineStore("zones", () => {
  const zones = ref<Record<string, HomeyZone>>({});

  const sortedZones = computed(() =>
    Object.values(zones.value).sort((a, b) => a.order - b.order)
  );

  function setZones(newZones: Record<string, HomeyZone>) {
    zones.value = newZones;
  }

  return { zones, sortedZones, setZones };
});
