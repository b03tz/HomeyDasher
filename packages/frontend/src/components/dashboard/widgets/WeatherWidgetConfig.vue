<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useDeviceStore } from "../../../stores/devices";
import { useZoneStore } from "../../../stores/zones";

const props = defineProps<{
  deviceId: string;
}>();

const emit = defineEmits<{
  "update:deviceId": [v: string];
}>();

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();

const search = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const selectedDevice = computed(() => deviceStore.devices[props.deviceId]);

const groupedResults = computed(() => {
  const query = search.value.toLowerCase().trim();
  const groups: { zoneName: string; items: { deviceId: string; deviceName: string }[] }[] = [];

  for (const zone of zoneStore.sortedZones) {
    const items: typeof groups[0]["items"] = [];
    const devicesInZone = deviceStore.devicesByZone[zone.id] ?? [];

    for (const device of devicesInZone) {
      if (query && !device.name.toLowerCase().includes(query)) continue;
      items.push({ deviceId: device.id, deviceName: device.name });
    }
    if (items.length > 0) groups.push({ zoneName: zone.name, items });
  }
  return groups;
});

function selectDevice(id: string) {
  emit("update:deviceId", id);
  search.value = "";
  isOpen.value = false;
}

function positionDropdown() {
  if (!inputEl.value) return;
  const rect = inputEl.value.getBoundingClientRect();
  dropdownStyle.value = { position: "fixed", top: `${rect.bottom + 4}px`, left: `${rect.left}px`, width: `${rect.width}px` };
}

async function openDropdown() {
  isOpen.value = true;
  await nextTick();
  positionDropdown();
}

function onBlur() {
  setTimeout(() => { isOpen.value = false; }, 200);
}
</script>

<template>
  <div class="weather-config">
    <label class="config-label">Weather device</label>
    <input
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      :placeholder="selectedDevice ? selectedDevice.name : 'Search devices...'"
      @input="openDropdown"
      @focus="openDropdown"
      @blur="onBlur"
    />
    <Teleport to="body">
      <div v-if="isOpen && groupedResults.length > 0" class="dropdown" :style="dropdownStyle">
        <div v-for="group in groupedResults" :key="group.zoneName" class="zone-group">
          <div class="zone-label">{{ group.zoneName }}</div>
          <button
            v-for="item in group.items"
            :key="item.deviceId"
            class="dropdown-item"
            @mousedown.prevent="selectDevice(item.deviceId)"
          >
            {{ item.deviceName }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.weather-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.search-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; outline: none;
}
.search-input:focus { border-color: var(--accent); }
</style>
