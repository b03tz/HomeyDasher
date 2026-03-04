<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useDeviceStore } from "../../../stores/devices";
import { useZoneStore } from "../../../stores/zones";

const props = defineProps<{
  devices: { deviceId: string; capabilityId: string }[];
  reverseColors: boolean;
}>();

const emit = defineEmits<{
  "update:devices": [devices: { deviceId: string; capabilityId: string }[]];
  "update:reverseColors": [value: boolean];
}>();

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();

const MAX_DEVICES = 16;

const search = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

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
        if (cap.type !== "boolean") continue;
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

    if (items.length > 0) {
      groups.push({ zoneName: zone.name, items });
    }
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
  return deviceStore.devices[d.deviceId]?.name ?? "Unknown device";
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

const remaining = computed(() => MAX_DEVICES - props.devices.length);
</script>

<template>
  <div class="status-config">
    <label class="config-label">
      Devices ({{ props.devices.length }}/{{ MAX_DEVICES }})
    </label>
    <input
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      placeholder="Search boolean capabilities..."
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
      <span
        v-for="(d, i) in props.devices"
        :key="d.deviceId + d.capabilityId"
        class="chip"
      >
        {{ deviceName(d) }}
        <button class="chip-remove" @click="removeDevice(i)" aria-label="Remove device">&times;</button>
      </span>
    </div>
    <p v-if="remaining > 0 && props.devices.length > 0" class="hint">
      {{ remaining }} more allowed
    </p>

    <label class="config-label">Colors</label>
    <div class="color-mode-picker">
      <button
        :class="['mode-btn', { active: !reverseColors }]"
        @click="emit('update:reverseColors', false)"
      >
        <span class="dot dot-green" /> Off &nbsp; <span class="dot dot-red" /> On
      </button>
      <button
        :class="['mode-btn', { active: reverseColors }]"
        @click="emit('update:reverseColors', true)"
      >
        <span class="dot dot-green" /> On &nbsp; <span class="dot dot-red" /> Off
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
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
.chip-remove { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 2px; }
.chip-remove:hover { color: var(--danger); }
.hint { font-size: 0.75rem; color: var(--text-secondary); }

.color-mode-picker {
  display: flex;
  gap: 6px;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.mode-btn:hover {
  border-color: var(--accent);
}

.mode-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #000;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-green { background: #4caf50; }
.dot-red { background: #f44336; }
</style>
