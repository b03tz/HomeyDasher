<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useDeviceStore } from "../../stores/devices";

interface InsightLog {
  id: string;
  title: string;
  units: string;
  ownerUri: string;
}

const props = defineProps<{
  selected: string | null;
}>();

const emit = defineEmits<{
  "update:selected": [logId: string];
}>();

const search = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});
const logs = ref<InsightLog[]>([]);

const deviceStore = useDeviceStore();

async function fetchLogs() {
  try {
    const res = await fetch("/api/insights/logs");
    if (!res.ok) return;
    const data: Record<string, any> = await res.json();
    logs.value = Object.values(data).map((l: any) => ({
      id: l.id,
      title: l.title ?? l.id,
      units: l.units ?? "",
      ownerUri: l.ownerUri ?? "",
    }));
  } catch {
    // ignore
  }
}

onMounted(fetchLogs);

// Group logs by device name
const groupedLogs = computed(() => {
  const query = search.value.toLowerCase().trim();
  const groups: { deviceName: string; items: InsightLog[] }[] = [];
  const byDevice = new Map<string, InsightLog[]>();

  for (const log of logs.value) {
    if (query && !log.title.toLowerCase().includes(query)) continue;

    // Extract device ID from ownerUri "homey:device:DEVICE_ID"
    let deviceName = log.ownerUri;
    if (log.ownerUri.startsWith("homey:device:")) {
      const deviceId = log.ownerUri.replace("homey:device:", "");
      const device = deviceStore.devices[deviceId];
      deviceName = device?.name ?? deviceId;
    } else if (log.ownerUri.startsWith("homey:app:")) {
      deviceName = log.ownerUri.replace("homey:app:", "");
    }

    if (!byDevice.has(deviceName)) byDevice.set(deviceName, []);
    byDevice.get(deviceName)!.push(log);
  }

  // Sort groups by device name
  for (const [deviceName, items] of [...byDevice.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    groups.push({ deviceName, items: items.sort((a, b) => a.title.localeCompare(b.title)) });
  }
  return groups;
});

const selectedLabel = computed(() => {
  if (!props.selected) return "";
  const log = logs.value.find((l) => l.id === props.selected);
  if (!log) return props.selected;

  let deviceName = "";
  if (log.ownerUri.startsWith("homey:device:")) {
    const deviceId = log.ownerUri.replace("homey:device:", "");
    deviceName = deviceStore.devices[deviceId]?.name ?? "";
  }
  return deviceName ? `${deviceName} — ${log.title}` : log.title;
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
  await nextTick();
  positionDropdown();
}

function onFocus() { openDropdown(); }
function onInput() { openDropdown(); }
function onBlur() { setTimeout(() => { isOpen.value = false; }, 200); }

function pickLog(logId: string) {
  emit("update:selected", logId);
  search.value = "";
  isOpen.value = false;
}

function clear() {
  emit("update:selected", null as any);
}
</script>

<template>
  <div class="insight-log-select">
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
      placeholder="Search insight logs..."
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <Teleport to="body">
      <div
        v-if="isOpen && groupedLogs.length > 0"
        class="dropdown"
        :style="dropdownStyle"
      >
        <div v-for="group in groupedLogs" :key="group.deviceName" class="zone-group">
          <div class="zone-label">{{ group.deviceName }}</div>
          <button
            v-for="log in group.items"
            :key="log.id"
            class="dropdown-item"
            @mousedown.prevent="pickLog(log.id)"
          >
            <span class="item-name">{{ log.title }}</span>
            <span v-if="log.units" class="item-cap">{{ log.units }}</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.insight-log-select {
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
</style>
