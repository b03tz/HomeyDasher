<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";

const props = defineProps<{
  flowId: string;
}>();

const emit = defineEmits<{
  "update:flowId": [v: string];
}>();

interface FlowItem {
  id: string;
  name: string;
}

const flows = ref<FlowItem[]>([]);
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
    flows.value = Object.values(data as Record<string, FlowItem>).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

const selectedFlow = computed(() => flows.value.find((f) => f.id === props.flowId));

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return flows.value;
  return flows.value.filter((f) => f.name.toLowerCase().includes(q));
});

function selectFlow(id: string) {
  emit("update:flowId", id);
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
  <div class="flow-select">
    <label class="config-label">Flow</label>
    <input
      ref="inputEl"
      v-model="search"
      type="text"
      class="search-input"
      :placeholder="loading ? 'Loading flows...' : selectedFlow ? selectedFlow.name : 'Search flows...'"
      :disabled="loading"
      @input="openDropdown"
      @focus="openDropdown"
      @blur="onBlur"
    />
    <Teleport to="body">
      <div v-if="isOpen && filtered.length > 0" class="dropdown" :style="dropdownStyle">
        <button
          v-for="flow in filtered"
          :key="flow.id"
          class="dropdown-item"
          @mousedown.prevent="selectFlow(flow.id)"
        >
          {{ flow.name }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.flow-select { display: flex; flex-direction: column; gap: 4px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.search-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; outline: none;
}
.search-input:focus { border-color: var(--accent); }
.search-input:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
