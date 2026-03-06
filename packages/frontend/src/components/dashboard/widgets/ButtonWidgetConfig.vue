<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import type { ButtonFlowRef } from "@homecontrol/shared";
import IconPicker from "../IconPicker.vue";
import { Icon } from "@iconify/vue";
import { resolveIconName } from "../../../utils/iconResolver";

const props = defineProps<{
  flows: ButtonFlowRef[];
}>();

const emit = defineEmits<{
  "update:flows": [flows: ButtonFlowRef[]];
}>();

const MAX_FLOWS = 8;

interface FlowItem {
  id: string;
  name: string;
}

const allFlows = ref<FlowItem[]>([]);
const loading = ref(false);
const search = ref("");
const isOpen = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

onMounted(async () => {
  loading.value = true;
  try {
    const res = await fetch("/api/flows");
    const data = await res.json();
    allFlows.value = Object.values(data as Record<string, FlowItem>).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return allFlows.value;
  return allFlows.value.filter(f => f.name.toLowerCase().includes(q));
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

function onBlur() {
  setTimeout(() => { isOpen.value = false; }, 200);
}

function addFlow(flow: FlowItem) {
  if (props.flows.length >= MAX_FLOWS) return;
  emit("update:flows", [...props.flows, { flowId: flow.id }]);
  search.value = "";
  isOpen.value = false;
}

function removeFlow(index: number) {
  const updated = [...props.flows];
  updated.splice(index, 1);
  emit("update:flows", updated);
}

function updateLabel(index: number, label: string) {
  const updated = [...props.flows];
  updated[index] = { ...updated[index], label: label || undefined };
  emit("update:flows", updated);
}

function updateColor(index: number, color: string) {
  const updated = [...props.flows];
  updated[index] = { ...updated[index], color: color || undefined };
  emit("update:flows", updated);
}

function updateIcon(index: number, icon: string) {
  const updated = [...props.flows];
  updated[index] = { ...updated[index], icon: icon || undefined };
  emit("update:flows", updated);
}

const iconPickerIndex = ref<number | null>(null);

function flowName(flowId: string) {
  return allFlows.value.find(f => f.id === flowId)?.name ?? "Unknown flow";
}

const remaining = computed(() => MAX_FLOWS - props.flows.length);
</script>

<template>
  <div class="button-config">
    <label class="config-label">
      Flows ({{ props.flows.length }}/{{ MAX_FLOWS }})
    </label>

    <div class="search-wrapper">
      <input
        ref="inputEl"
        v-model="search"
        type="text"
        class="search-input"
        :placeholder="loading ? 'Loading flows...' : 'Search flows...'"
        :disabled="loading || props.flows.length >= MAX_FLOWS"
        @input="openDropdown"
        @focus="openDropdown"
        @blur="onBlur"
      />
      <Teleport to="body">
        <div v-if="isOpen && filtered.length > 0" class="flow-dropdown" :style="dropdownStyle">
          <button
            v-for="flow in filtered"
            :key="flow.id"
            class="flow-dropdown-item"
            @mousedown.prevent="addFlow(flow)"
          >
            {{ flow.name }}
          </button>
        </div>
      </Teleport>
    </div>

    <div v-if="props.flows.length > 0" class="flow-list">
      <div
        v-for="(ref, i) in props.flows"
        :key="ref.flowId + i"
        class="flow-row"
      >
        <span class="chip">
          {{ flowName(ref.flowId) }}
          <button class="chip-remove" @click="removeFlow(i)" aria-label="Remove flow">&times;</button>
        </span>
        <input
          type="text"
          class="label-input"
          placeholder="Custom label..."
          :value="ref.label ?? ''"
          @input="updateLabel(i, ($event.target as HTMLInputElement).value)"
        />
        <button class="icon-pick-btn" @click="iconPickerIndex = i" :title="ref.icon ? ref.icon : 'Pick icon'">
          <Icon v-if="resolveIconName(ref.icon)" :icon="resolveIconName(ref.icon)!" :width="18" :height="18" />
          <span v-else class="icon-pick-label">Icon</span>
        </button>
        <input
          type="color"
          class="color-picker"
          :value="ref.color || '#4fc3f7'"
          @input="updateColor(i, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <p v-if="remaining > 0 && props.flows.length > 0" class="hint">
      {{ remaining }} more flow{{ remaining !== 1 ? 's' : '' }} allowed
    </p>

    <IconPicker
      :open="iconPickerIndex !== null"
      :model-value="iconPickerIndex !== null ? (props.flows[iconPickerIndex]?.icon ?? '') : ''"
      @update:model-value="(v: string) => { if (iconPickerIndex !== null) updateIcon(iconPickerIndex, v); }"
      @close="iconPickerIndex = null"
    />
  </div>
</template>

<style scoped>
.button-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.search-wrapper {
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
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.chip-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 2px;
}

.chip-remove:hover {
  color: var(--danger);
}

.label-input {
  flex: 1;
  min-width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
}

.label-input:focus {
  border-color: var(--accent);
}

.color-picker {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: none;
  cursor: pointer;
  padding: 2px;
  flex-shrink: 0;
}

.icon-pick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.icon-pick-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.icon-pick-label {
  font-size: 0.65rem;
  font-weight: 600;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>

<style>
.flow-dropdown {
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  z-index: 10000;
}

.flow-dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-primary, #fff);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}

.flow-dropdown-item:hover {
  background: var(--bg-card, #2a2a2a);
  color: var(--accent, #4fc3f7);
}
</style>
