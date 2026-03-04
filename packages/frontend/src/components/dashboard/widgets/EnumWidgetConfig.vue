<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useDeviceStore } from "../../../stores/devices";
import { useZoneStore } from "../../../stores/zones";

const props = defineProps<{
  deviceId: string;
  capabilityId: string;
  displayMode: "popup" | "scroll";
}>();

const emit = defineEmits<{
  "update:deviceId": [v: string];
  "update:capabilityId": [v: string];
  "update:displayMode": [v: "popup" | "scroll"];
}>();

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();

const search = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const selectedDevice = computed(() => deviceStore.devices[props.deviceId]);
const selectedCap = computed(() => selectedDevice.value?.capabilities[props.capabilityId]);

const groupedResults = computed(() => {
  const query = search.value.toLowerCase().trim();
  const groups: { zoneName: string; items: { deviceId: string; deviceName: string; capabilityId: string; capabilityTitle: string }[] }[] = [];

  for (const zone of zoneStore.sortedZones) {
    const items: typeof groups[0]["items"] = [];
    const devicesInZone = deviceStore.devicesByZone[zone.id] ?? [];

    for (const device of devicesInZone) {
      if (query && !device.name.toLowerCase().includes(query)) continue;
      for (const cap of Object.values(device.capabilities)) {
        if (!cap.setable) continue;
        if (!cap.values || cap.values.length === 0) continue;
        items.push({
          deviceId: device.id,
          deviceName: device.name,
          capabilityId: cap.id,
          capabilityTitle: cap.title,
        });
      }
    }
    if (items.length > 0) groups.push({ zoneName: zone.name, items });
  }
  return groups;
});

function selectItem(deviceId: string, capabilityId: string) {
  emit("update:deviceId", deviceId);
  emit("update:capabilityId", capabilityId);
  search.value = "";
  isOpen.value = false;
}

function positionDropdown() {
  if (!inputEl.value) return;
  const rect = inputEl.value.getBoundingClientRect();
  dropdownStyle.value = {
    position: "fixed",
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  };
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
  <div class="enum-config">
    <label class="config-label">Device &amp; Capability (enum with values)</label>
    <input
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      :placeholder="selectedDevice ? `${selectedDevice.name} — ${selectedCap?.title ?? capabilityId}` : 'Search enum capabilities...'"
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
            :key="item.deviceId + item.capabilityId"
            class="dropdown-item"
            @mousedown.prevent="selectItem(item.deviceId, item.capabilityId)"
          >
            <span class="item-name">{{ item.deviceName }}</span>
            <span class="item-cap">{{ item.capabilityTitle }}</span>
          </button>
        </div>
      </div>
    </Teleport>

    <label class="config-label">Display Mode</label>
    <div class="picker">
      <button class="pick-btn" :class="{ active: displayMode === 'popup' }" @click="emit('update:displayMode', 'popup')">Popup</button>
      <button class="pick-btn" :class="{ active: displayMode === 'scroll' }" @click="emit('update:displayMode', 'scroll')">Scroll Picker</button>
    </div>
  </div>
</template>

<style scoped>
.enum-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.search-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; outline: none;
}
.search-input:focus { border-color: var(--accent); }
.picker { display: flex; gap: 4px; }
.pick-btn {
  flex: 1; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.8rem; cursor: pointer;
}
.pick-btn.active { border-color: var(--accent); background: rgba(79, 195, 247, 0.1); color: var(--accent); }
</style>
