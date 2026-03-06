<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import mdiData from "@iconify-json/mdi/icons.json";

const props = defineProps<{
  modelValue?: string;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  close: [];
}>();

const search = ref("");
const allNames = ref<string[]>([]);

onMounted(() => {
  allNames.value = Object.keys(mdiData.icons).sort();
});

const filtered = computed(() => {
  if (!search.value) return allNames.value;
  const q = search.value.toLowerCase().replace(/\s+/g, "-");
  return allNames.value.filter((n) => n.includes(q));
});

// Virtualization: only render visible icons to avoid DOM overload
const PAGE_SIZE = 200;
const visibleCount = ref(PAGE_SIZE);

const displayed = computed(() => filtered.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < filtered.value.length);

function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filtered.value.length);
  }
}

// Reset visible count on search change
import { watch } from "vue";
watch(search, () => {
  visibleCount.value = PAGE_SIZE;
});

function select(name: string) {
  emit("update:modelValue", name);
  emit("close");
}

function clearIcon() {
  emit("update:modelValue", "");
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="icon-picker-overlay" @click.self="emit('close')">
      <div class="icon-picker-modal">
        <div class="icon-picker-header">
          <h3>Pick Icon</h3>
          <span class="icon-count">{{ filtered.length.toLocaleString() }} icons</span>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>
        <div class="icon-picker-search">
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="Search icons (e.g. light, thermostat, door)..."
          />
        </div>
        <div v-if="modelValue" class="icon-picker-actions">
          <button class="clear-btn" @click="clearIcon">Clear icon</button>
        </div>
        <div class="icon-grid" @scroll="onScroll">
          <button
            v-for="name in displayed"
            :key="name"
            class="icon-cell"
            :class="{ selected: modelValue === name }"
            :title="name"
            @click="select(name)"
          >
            <Icon :icon="'mdi:' + name" :width="24" :height="24" />
          </button>
          <p v-if="hasMore" class="load-more">Scroll for more...</p>
          <p v-if="filtered.length === 0" class="no-results">No icons found</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.icon-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.icon-picker-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.icon-picker-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.icon-picker-header h3 {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
}

.icon-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-right: 12px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-picker-search {
  padding: 12px 16px 0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--accent);
}

.icon-picker-actions {
  padding: 8px 16px 0;
}

.clear-btn {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.clear-btn:hover {
  border-color: var(--danger, #f44336);
  color: var(--danger, #f44336);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 48px);
  gap: 6px;
  padding: 12px 16px 16px;
  overflow-y: auto;
  justify-content: center;
}

.icon-cell {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-cell:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.icon-cell.selected {
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-card));
  border-color: var(--accent);
  color: var(--accent);
}

.load-more,
.no-results {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding: 12px 0;
}
</style>
