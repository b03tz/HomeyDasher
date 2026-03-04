<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import type { WidgetDeviceRef } from "@homecontrol/shared";
import { useDeviceStore } from "../../stores/devices";
import { useZoneStore } from "../../stores/zones";

const props = defineProps<{
  selected: WidgetDeviceRef[];
  max: number;
}>();

const emit = defineEmits<{
  add: [ref: WidgetDeviceRef];
}>();

const search = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();

const selectedKeys = computed(() =>
  new Set(props.selected.map((s) => `${s.deviceId}:${s.capabilityId}`))
);

const groupedResults = computed(() => {
  const query = search.value.toLowerCase().trim();
  const groups: { zoneName: string; items: { deviceId: string; deviceName: string; capabilityId: string; capabilityTitle: string }[] }[] = [];

  for (const zone of zoneStore.sortedZones) {
    const items: typeof groups[0]["items"] = [];
    const devicesInZone = deviceStore.devicesByZone[zone.id] ?? [];

    for (const device of devicesInZone) {
      if (query && !device.name.toLowerCase().includes(query)) continue;
      const cap = device.capabilities["onoff"];
      if (!cap || !cap.setable) continue;
      const key = `${device.id}:${cap.id}`;
      if (selectedKeys.value.has(key)) continue;

      items.push({
        deviceId: device.id,
        deviceName: device.name,
        capabilityId: cap.id,
        capabilityTitle: cap.title,
      });
    }

    if (items.length > 0) {
      groups.push({ zoneName: zone.name, items });
    }
  }
  return groups;
});

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

function selectItem(deviceId: string, capabilityId: string) {
  if (props.selected.length >= props.max) return;
  emit("add", { deviceId, capabilityId });
  search.value = "";
  isOpen.value = false;
}

async function openDropdown() {
  isOpen.value = true;
  await nextTick();
  positionDropdown();
}

function onFocus() {
  openDropdown();
}

function onInput() {
  openDropdown();
}

function onBlur() {
  setTimeout(() => { isOpen.value = false; }, 200);
}
</script>

<template>
  <div class="device-search">
    <input
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      placeholder="Search devices..."
      :disabled="selected.length >= max"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <Teleport to="body">
      <div
        v-if="isOpen && groupedResults.length > 0"
        class="dropdown"
        :style="dropdownStyle"
      >
        <div v-for="group in groupedResults" :key="group.zoneName" class="zone-group">
          <div class="zone-label">{{ group.zoneName }}</div>
          <button
            v-for="item in group.items"
            :key="item.deviceId + item.capabilityId"
            class="dropdown-item"
            @mousedown.prevent="selectItem(item.deviceId, item.capabilityId)"
          >
            <span class="item-name">{{ item.deviceName }}</span>
            <span v-if="item.capabilityTitle !== 'On/Off'" class="item-cap">{{ item.capabilityTitle }}</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.device-search {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<style>
/* Dropdown is teleported to body — no scoped */
.dropdown {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 260px;
  overflow-y: auto;
  z-index: 4000;
}

.dropdown .zone-group {
  padding: 4px 0;
}

.dropdown .zone-group + .zone-group {
  border-top: 1px solid var(--border);
}

.dropdown .zone-label {
  padding: 6px 12px 2px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dropdown .dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
}

.dropdown .dropdown-item:hover {
  background: var(--bg-card);
}

.dropdown .item-cap {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>
