<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import type { BatteryOrientation, BatteryStyle, BatterySize } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import { useZoneStore } from "../../../stores/zones";

const props = defineProps<{
  deviceId: string;
  capabilityId: string;
  orientation: BatteryOrientation;
  style: BatteryStyle;
  size: BatterySize;
  color: string;
  unit: string;
  multiplier: number;
  min?: number;
  max?: number;
  decimals: number | undefined;
}>();

const emit = defineEmits<{
  "update:deviceId": [v: string];
  "update:capabilityId": [v: string];
  "update:orientation": [v: BatteryOrientation];
  "update:style": [v: BatteryStyle];
  "update:size": [v: BatterySize];
  "update:color": [v: string];
  "update:unit": [v: string];
  "update:multiplier": [v: number];
  "update:min": [v: number | undefined];
  "update:max": [v: number | undefined];
  "update:decimals": [v: number | undefined];
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
        if (cap.type !== "number") continue;
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

function parseNum(val: string): number | undefined {
  const n = Number(val);
  return val === "" || isNaN(n) ? undefined : n;
}
</script>

<template>
  <div class="battery-config">
    <label class="config-label">Device &amp; Capability</label>
    <input
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      :placeholder="selectedDevice ? `${selectedDevice.name} — ${selectedCap?.title ?? capabilityId}` : 'Search number capabilities...'"
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

    <label class="config-label">Orientation</label>
    <div class="toggle-row">
      <button
        :class="['toggle-btn', { active: orientation === 'horizontal' }]"
        @click="emit('update:orientation', 'horizontal')"
      >Horizontal</button>
      <button
        :class="['toggle-btn', { active: orientation === 'vertical' }]"
        @click="emit('update:orientation', 'vertical')"
      >Vertical</button>
    </div>

    <label class="config-label">Style</label>
    <div class="toggle-row">
      <button
        :class="['toggle-btn', { active: style === 'bars' }]"
        @click="emit('update:style', 'bars')"
      >10 Bars</button>
      <button
        :class="['toggle-btn', { active: style === 'continuous' }]"
        @click="emit('update:style', 'continuous')"
      >Continuous</button>
    </div>

    <label class="config-label">Size</label>
    <div class="toggle-row">
      <button
        :class="['toggle-btn', { active: size === 'small' }]"
        @click="emit('update:size', 'small')"
      >Small</button>
      <button
        :class="['toggle-btn', { active: size === 'medium' }]"
        @click="emit('update:size', 'medium')"
      >Medium</button>
      <button
        :class="['toggle-btn', { active: size === 'large' }]"
        @click="emit('update:size', 'large')"
      >Large</button>
    </div>

    <label class="config-label">Fill Color</label>
    <input
      type="color"
      class="color-input"
      :value="color || '#4fc3f7'"
      @input="emit('update:color', ($event.target as HTMLInputElement).value)"
    />

    <div class="row">
      <div class="field">
        <label class="config-label">Unit</label>
        <input
          type="text"
          class="text-input"
          :value="unit"
          placeholder="e.g. %"
          @input="emit('update:unit', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="field">
        <label class="config-label">Multiplier</label>
        <input
          type="number"
          class="text-input"
          :value="multiplier"
          step="0.01"
          @input="emit('update:multiplier', Number(($event.target as HTMLInputElement).value) || 1)"
        />
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label class="config-label">Min</label>
        <input
          type="number"
          class="text-input"
          :value="min ?? ''"
          placeholder="0"
          @input="emit('update:min', parseNum(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="field">
        <label class="config-label">Max</label>
        <input
          type="number"
          class="text-input"
          :value="max ?? ''"
          placeholder="100"
          @input="emit('update:max', parseNum(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <label class="config-label">Decimals</label>
    <div class="decimals-picker">
      <button
        :class="['dec-btn', { active: decimals == null }]"
        @click="emit('update:decimals', undefined)"
      >Auto</button>
      <button
        :class="['dec-btn', { active: decimals === 0 }]"
        @click="emit('update:decimals', 0)"
      >0</button>
      <button
        :class="['dec-btn', { active: decimals === 1 }]"
        @click="emit('update:decimals', 1)"
      >1</button>
      <button
        :class="['dec-btn', { active: decimals === 2 }]"
        @click="emit('update:decimals', 2)"
      >2</button>
    </div>
  </div>
</template>

<style scoped>
.battery-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.search-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; outline: none;
}
.search-input:focus { border-color: var(--accent); }
.row { display: flex; gap: 8px; }
.field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.text-input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; outline: none;
}
.text-input:focus { border-color: var(--accent); }

.toggle-row { display: flex; gap: 6px; }
.toggle-btn {
  flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.8rem;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.toggle-btn:hover { border-color: var(--accent); }
.toggle-btn.active { border-color: var(--accent); background: var(--accent); color: #000; }

.color-input {
  width: 48px; height: 32px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); cursor: pointer; padding: 2px;
}

.decimals-picker { display: flex; gap: 6px; }
.dec-btn {
  flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.8rem;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.dec-btn:hover { border-color: var(--accent); }
.dec-btn.active { border-color: var(--accent); background: var(--accent); color: #000; }

/* Dropdown (same as GaugeWidgetConfig) */
.dropdown {
  z-index: 9999;
  max-height: 260px;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.zone-group { padding: 4px 0; }
.zone-label {
  padding: 4px 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  color: var(--text-secondary); letter-spacing: 0.05em;
}
.dropdown-item {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; padding: 8px 12px; border: none; background: transparent;
  color: var(--text-primary); font-size: 0.85rem; cursor: pointer; text-align: left;
}
.dropdown-item:hover { background: var(--bg-secondary); }
.item-cap { font-size: 0.75rem; color: var(--text-secondary); }
</style>
