<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import type { GroupStatusMode } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import { useZoneStore } from "../../../stores/zones";

const props = defineProps<{
  devices: { deviceId: string; capabilityId: string }[];
  mode: GroupStatusMode;
  unit: string;
  multiplier: number;
}>();

const emit = defineEmits<{
  "update:devices": [v: { deviceId: string; capabilityId: string }[]];
  "update:mode": [v: GroupStatusMode];
  "update:unit": [v: string];
  "update:multiplier": [v: number];
}>();

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();

const search = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});
const MAX_DEVICES = 24;

const capTypeFilter = computed(() =>
  props.mode === "sum" ? "number" : "boolean"
);

const selectedKeys = computed(() =>
  new Set(props.devices.map((d) => `${d.deviceId}:${d.capabilityId}`))
);

const groupedResults = computed(() => {
  const query = search.value.toLowerCase().trim();
  const groups: { zoneName: string; items: { deviceId: string; deviceName: string; capabilityId: string; capabilityTitle: string }[] }[] = [];

  for (const zone of zoneStore.sortedZones) {
    const items: typeof groups[0]["items"] = [];
    const devicesInZone = deviceStore.devicesByZone[zone.id] ?? [];

    for (const device of devicesInZone) {
      if (query && !device.name.toLowerCase().includes(query)) continue;
      for (const cap of Object.values(device.capabilities)) {
        if (cap.type !== capTypeFilter.value) continue;
        const key = `${device.id}:${cap.id}`;
        if (selectedKeys.value.has(key)) continue;
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

function addDevice(deviceId: string, capabilityId: string) {
  if (props.devices.length >= MAX_DEVICES) return;
  emit("update:devices", [...props.devices, { deviceId, capabilityId }]);
  search.value = "";
  isOpen.value = false;
}

function removeDevice(index: number) {
  const updated = [...props.devices];
  updated.splice(index, 1);
  emit("update:devices", updated);
}

function deviceName(d: { deviceId: string }) {
  return deviceStore.devices[d.deviceId]?.name ?? "Unknown";
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
  <div class="group-config">
    <label class="config-label">Mode</label>
    <div class="mode-picker">
      <button
        v-for="m in (['count', 'allOff', 'sum'] as const)"
        :key="m"
        class="mode-btn"
        :class="{ active: mode === m }"
        @click="emit('update:mode', m)"
      >
        {{ m === 'count' ? 'Count' : m === 'allOff' ? 'All Off' : 'Sum' }}
      </button>
    </div>

    <label class="config-label">Devices ({{ capTypeFilter }})</label>
    <input
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      :placeholder="`Search ${capTypeFilter} capabilities...`"
      :disabled="props.devices.length >= MAX_DEVICES"
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
            @mousedown.prevent="addDevice(item.deviceId, item.capabilityId)"
          >
            <span class="item-name">{{ item.deviceName }}</span>
            <span class="item-cap">{{ item.capabilityTitle }}</span>
          </button>
        </div>
      </div>
    </Teleport>

    <div v-if="props.devices.length > 0" class="chip-list">
      <span v-for="(d, i) in props.devices" :key="d.deviceId + d.capabilityId" class="chip">
        {{ deviceName(d) }}
        <button class="chip-remove" @click="removeDevice(i)">&times;</button>
      </span>
    </div>

    <template v-if="mode === 'sum'">
      <div class="row">
        <div class="field">
          <label class="config-label">Unit</label>
          <input type="text" class="text-input" :value="unit" placeholder="e.g. kW" @input="emit('update:unit', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="field">
          <label class="config-label">Multiplier</label>
          <input type="number" class="text-input" :value="multiplier" step="0.001" @input="emit('update:multiplier', Number(($event.target as HTMLInputElement).value) || 1)" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.group-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.mode-picker { display: flex; gap: 4px; }
.mode-btn {
  flex: 1; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.8rem; cursor: pointer;
}
.mode-btn.active { border-color: var(--accent); background: rgba(79, 195, 247, 0.1); color: var(--accent); }
.search-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; outline: none;
}
.search-input:focus { border-color: var(--accent); }
.search-input:disabled { opacity: 0.5; cursor: not-allowed; }
.chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: flex; align-items: center; gap: 4px; padding: 4px 8px;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
  font-size: 0.8rem; color: var(--text-primary);
}
.chip-remove { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1rem; padding: 0 2px; }
.chip-remove:hover { color: var(--danger); }
.row { display: flex; gap: 8px; }
.field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.text-input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; outline: none;
}
.text-input:focus { border-color: var(--accent); }
</style>
