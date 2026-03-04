<script setup lang="ts">
import { ref, computed } from "vue";
import type { HomeyDevice } from "@homecontrol/shared";
import { useDeviceStore } from "../../stores/devices";
import { useZoneStore } from "../../stores/zones";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();

const search = ref("");
const selectedDevice = ref<HomeyDevice | null>(null);

const filteredDevices = computed(() => {
  const q = search.value.toLowerCase().trim();
  const all = Object.values(deviceStore.devices);
  const filtered = q ? all.filter((d) => d.name.toLowerCase().includes(q)) : all;
  filtered.sort((a, b) => a.name.localeCompare(b.name));
  return filtered;
});

function zoneName(device: HomeyDevice) {
  return zoneStore.zones[device.zoneId]?.name ?? device.zoneId;
}

function selectDevice(device: HomeyDevice) {
  selectedDevice.value = device;
}

function goBack() {
  selectedDevice.value = null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dev-overlay" @click.self="emit('close')">
      <div class="dev-modal">
        <div class="dev-header">
          <button v-if="selectedDevice" class="back-btn" @click="goBack">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2>{{ selectedDevice ? selectedDevice.name : 'Device Inspector' }}</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <!-- Device list -->
        <template v-if="!selectedDevice">
          <div class="dev-search">
            <input v-model="search" type="text" placeholder="Filter devices..." class="search-input" />
          </div>
          <div class="dev-list">
            <button
              v-for="device in filteredDevices"
              :key="device.id"
              class="device-row"
              @click="selectDevice(device)"
            >
              <span class="device-name">{{ device.name }}</span>
              <span class="device-meta">{{ zoneName(device) }} &middot; {{ device.class }}</span>
            </button>
            <p v-if="filteredDevices.length === 0" class="no-results">No devices found</p>
          </div>
        </template>

        <!-- Device detail -->
        <template v-else>
          <div class="dev-detail">
            <table class="props-table">
              <tbody>
                <tr>
                  <td class="prop-key">ID</td>
                  <td class="prop-val mono">{{ selectedDevice.id }}</td>
                </tr>
                <tr>
                  <td class="prop-key">Zone</td>
                  <td class="prop-val">{{ zoneName(selectedDevice) }}</td>
                </tr>
                <tr>
                  <td class="prop-key">Class</td>
                  <td class="prop-val">{{ selectedDevice.class }}</td>
                </tr>
                <tr>
                  <td class="prop-key">Available</td>
                  <td class="prop-val">{{ selectedDevice.available }}</td>
                </tr>
              </tbody>
            </table>

            <h3 class="section-title">Capabilities ({{ Object.keys(selectedDevice.capabilities).length }})</h3>
            <table class="props-table">
              <thead>
                <tr class="table-header">
                  <td>ID</td>
                  <td>Title</td>
                  <td>Type</td>
                  <td>Value</td>
                  <td>Get</td>
                  <td>Set</td>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cap in Object.values(selectedDevice.capabilities)" :key="cap.id">
                  <td class="prop-val mono">{{ cap.id }}</td>
                  <td class="prop-val">{{ cap.title }}</td>
                  <td class="prop-val">{{ cap.type }}</td>
                  <td class="prop-val mono">{{ formatValue(cap.value) }}</td>
                  <td class="prop-val">{{ cap.getable ? 'Y' : 'N' }}</td>
                  <td class="prop-val">{{ cap.setable ? 'Y' : 'N' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dev-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dev-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dev-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.dev-header h2 {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.close-btn:hover { color: var(--text-primary); }

.back-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.back-btn:hover { color: var(--text-primary); }

.dev-search {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
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
}

.search-input:focus { border-color: var(--accent); }

.dev-list {
  overflow-y: auto;
  flex: 1;
}

.device-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 20px;
  border: none;
  background: none;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  gap: 12px;
}

.device-row:hover { background: var(--bg-card); }

.device-row + .device-row { border-top: 1px solid var(--border); }

.device-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.device-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.no-results {
  text-align: center;
  color: var(--text-secondary);
  padding: 32px;
}

.dev-detail {
  overflow-y: auto;
  flex: 1;
  padding: 16px 20px;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 20px;
  margin-bottom: 8px;
}

.props-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.props-table tr + tr { border-top: 1px solid var(--border); }

.props-table td {
  padding: 6px 8px;
  vertical-align: top;
}

.table-header td {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.prop-key {
  color: var(--text-secondary);
  white-space: nowrap;
  width: 1%;
}

.prop-val {
  color: var(--text-primary);
  word-break: break-all;
}

.mono {
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 0.75rem;
}
</style>
