<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useDeviceStore } from "../../stores/devices";
import { useZoneStore } from "../../stores/zones";

const props = defineProps<{
  capabilityFilter: "number" | "boolean";
  selected: { deviceId: string; capabilityId: string } | null;
}>();

const emit = defineEmits<{
  "update:selected": [value: { deviceId: string; capabilityId: string }];
}>();

const search = ref("");
const isOpen = ref(false);
const pickedDeviceId = ref<string | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();

// Devices grouped by zone, filtered to those with at least one matching capability
const groupedDevices = computed(() => {
  const query = search.value.toLowerCase().trim();
  const groups: { zoneName: string; items: { deviceId: string; deviceName: string }[] }[] = [];

  for (const zone of zoneStore.sortedZones) {
    const items: typeof groups[0]["items"] = [];
    const devicesInZone = deviceStore.devicesByZone[zone.id] ?? [];

    for (const device of devicesInZone) {
      if (query && !device.name.toLowerCase().includes(query)) continue;

      const hasMatch = Object.values(device.capabilities).some(
        (cap) => cap.type === props.capabilityFilter && cap.getable
      );
      if (!hasMatch) continue;

      items.push({ deviceId: device.id, deviceName: device.name });
    }

    if (items.length > 0) {
      groups.push({ zoneName: zone.name, items });
    }
  }
  return groups;
});

// Capabilities for the picked device
const capabilityOptions = computed(() => {
  if (!pickedDeviceId.value) return [];
  const device = deviceStore.devices[pickedDeviceId.value];
  if (!device) return [];

  return Object.values(device.capabilities).filter(
    (cap) => cap.type === props.capabilityFilter && cap.getable
  );
});

const selectedLabel = computed(() => {
  if (!props.selected) return "";
  const device = deviceStore.devices[props.selected.deviceId];
  if (!device) return "Unknown device";
  const cap = device.capabilities[props.selected.capabilityId];
  return `${device.name} — ${cap?.title ?? props.selected.capabilityId}`;
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

async function openDropdown() {
  isOpen.value = true;
  pickedDeviceId.value = null;
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

function pickDevice(deviceId: string) {
  const device = deviceStore.devices[deviceId];
  if (!device) return;

  const matching = Object.values(device.capabilities).filter(
    (cap) => cap.type === props.capabilityFilter && cap.getable
  );

  if (matching.length === 1) {
    // Only one matching capability — auto-select
    emit("update:selected", { deviceId, capabilityId: matching[0].id });
    search.value = "";
    isOpen.value = false;
  } else {
    // Multiple capabilities — show second step
    pickedDeviceId.value = deviceId;
  }
}

function pickCapability(capabilityId: string) {
  if (!pickedDeviceId.value) return;
  emit("update:selected", { deviceId: pickedDeviceId.value, capabilityId });
  search.value = "";
  isOpen.value = false;
  pickedDeviceId.value = null;
}

function clear() {
  emit("update:selected", null as any);
}
</script>

<template>
  <div class="device-cap-select">
    <div v-if="selected" class="selected-chip">
      <span class="chip-label">{{ selectedLabel }}</span>
      <button class="chip-remove" @click="clear" aria-label="Clear selection">&times;</button>
    </div>
    <input
      v-else
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      placeholder="Search devices..."
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="dropdown"
        :style="dropdownStyle"
      >
        <!-- Step 1: pick device -->
        <template v-if="!pickedDeviceId">
          <template v-if="groupedDevices.length > 0">
            <div v-for="group in groupedDevices" :key="group.zoneName" class="zone-group">
              <div class="zone-label">{{ group.zoneName }}</div>
              <button
                v-for="item in group.items"
                :key="item.deviceId"
                class="dropdown-item"
                @mousedown.prevent="pickDevice(item.deviceId)"
              >
                <span class="item-name">{{ item.deviceName }}</span>
              </button>
            </div>
          </template>
          <div v-else class="dropdown-empty">No matching devices</div>
        </template>

        <!-- Step 2: pick capability -->
        <template v-else>
          <div class="zone-group">
            <div class="zone-label">Pick capability</div>
            <button
              v-for="cap in capabilityOptions"
              :key="cap.id"
              class="dropdown-item"
              @mousedown.prevent="pickCapability(cap.id)"
            >
              <span class="item-name">{{ cap.title }}</span>
              <span v-if="cap.units" class="item-cap">{{ cap.units }}</span>
            </button>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.device-cap-select {
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

.selected-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.chip-label {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.chip-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 2px;
}

.chip-remove:hover {
  color: var(--danger);
}

.dropdown-empty {
  padding: 12px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: center;
}
</style>

<style>
/* Dropdown is teleported to body — no scoped */
.device-cap-select + .dropdown,
body > .dropdown {
  /* styles inherited from existing dropdown classes */
}
</style>
