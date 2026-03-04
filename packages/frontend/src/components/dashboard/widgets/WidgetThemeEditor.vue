<script setup lang="ts">
import { ref } from "vue";
import type { WidgetTheme } from "@homecontrol/shared";

const props = defineProps<{
  theme: WidgetTheme;
  widgetType: string;
}>();

const emit = defineEmits<{
  "update:theme": [theme: WidgetTheme];
  applyToAll: [theme: WidgetTheme];
}>();

// ─── Hex ↔ alpha helpers ───
// Stored format: #rrggbb or #rrggbbaa

function parseColor(val: string | undefined): { hex6: string; alpha: number } {
  if (!val) return { hex6: "#000000", alpha: 100 };
  if (/^#[0-9a-fA-F]{8}$/.test(val)) {
    const a = parseInt(val.slice(7, 9), 16);
    return { hex6: val.slice(0, 7), alpha: Math.round((a / 255) * 100) };
  }
  return { hex6: val.slice(0, 7) || "#000000", alpha: 100 };
}

function toStored(hex6: string, alpha: number): string {
  if (alpha >= 100) return hex6;
  const a = Math.round((alpha / 100) * 255);
  return hex6 + a.toString(16).padStart(2, "0");
}

function update(key: keyof WidgetTheme, value: string | undefined) {
  const next = { ...props.theme };
  if (value) {
    next[key] = value;
  } else {
    delete next[key];
  }
  emit("update:theme", next);
}

function onColorInput(key: keyof WidgetTheme, e: Event) {
  const hex6 = (e.target as HTMLInputElement).value;
  const { alpha } = parseColor(props.theme[key]);
  update(key, toStored(hex6, alpha));
}

function onAlphaInput(key: keyof WidgetTheme, e: Event) {
  const alpha = Number((e.target as HTMLInputElement).value);
  const { hex6 } = parseColor(props.theme[key]);
  update(key, toStored(hex6, alpha));
}

function onHexInput(key: keyof WidgetTheme, e: Event) {
  const val = (e.target as HTMLInputElement).value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{8}$/.test(val)) {
    update(key, val);
  }
}

function clear(key: keyof WidgetTheme) {
  update(key, undefined);
}

function getHex6(key: keyof WidgetTheme): string {
  return parseColor(props.theme[key]).hex6;
}

function getAlpha(key: keyof WidgetTheme): number {
  return parseColor(props.theme[key]).alpha;
}

// In-memory fallback when clipboard API is unavailable (plain HTTP)
let themeClipboard: string | null = null;

async function copyTheme() {
  const json = JSON.stringify(props.theme);
  themeClipboard = json;
  try {
    await navigator.clipboard.writeText(json);
  } catch { /* secure context unavailable, in-memory copy still works */ }
}

async function pasteTheme() {
  try {
    let text = themeClipboard;
    try {
      text = await navigator.clipboard.readText();
    } catch { /* fall back to in-memory clipboard */ }
    if (!text) return;
    const parsed = JSON.parse(text);
    const valid: WidgetTheme = {};
    const keys: (keyof WidgetTheme)[] = [
      "background", "foreground", "secondaryText", "borderColor",
      "accentColor", "subBackground", "sliderFillColor",
    ];
    for (const k of keys) {
      if (typeof parsed[k] === "string") valid[k] = parsed[k];
    }
    emit("update:theme", valid);
  } catch { /* ignore invalid data */ }
}

function resetTheme() {
  emit("update:theme", {});
}

// Apply to all
const confirmApplyAll = ref(false);

function applyToAll() {
  if (!confirmApplyAll.value) {
    confirmApplyAll.value = true;
    return;
  }
  emit("applyToAll", { ...props.theme });
  confirmApplyAll.value = false;
}

const showSubItems = ["switch", "status", "group-status", "container"].includes(props.widgetType);
const showSlider = props.widgetType === "slider";

interface ColorField {
  key: keyof WidgetTheme;
  label: string;
}

const generalFields: ColorField[] = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "secondaryText", label: "Secondary Text" },
  { key: "borderColor", label: "Border" },
  { key: "accentColor", label: "Accent" },
];

const subFields: ColorField[] = [
  { key: "subBackground", label: "Sub Background" },
];

const sliderFields: ColorField[] = [
  { key: "sliderFillColor", label: "Fill Track" },
];
</script>

<template>
  <div class="theme-editor">
    <!-- General -->
    <div class="section-label">General</div>
    <div v-for="field in generalFields" :key="field.key" class="color-field">
      <div class="color-row">
        <span class="color-label">{{ field.label }}</span>
        <div class="color-controls">
          <input
            type="color"
            class="color-picker"
            :value="getHex6(field.key)"
            @input="onColorInput(field.key, $event)"
          />
          <input
            type="text"
            class="hex-input"
            :value="theme[field.key] || ''"
            placeholder="#000000"
            maxlength="9"
            @change="onHexInput(field.key, $event)"
          />
          <button
            v-if="theme[field.key]"
            class="clear-btn"
            @click="clear(field.key)"
          >&times;</button>
        </div>
      </div>
      <div v-if="theme[field.key]" class="alpha-row">
        <span class="alpha-label">Opacity</span>
        <input
          type="range"
          class="alpha-slider"
          min="0"
          max="100"
          :value="getAlpha(field.key)"
          @input="onAlphaInput(field.key, $event)"
        />
        <span class="alpha-value">{{ getAlpha(field.key) }}%</span>
      </div>
    </div>

    <!-- Sub items (switch/status/group-status/container) -->
    <template v-if="showSubItems">
      <div class="section-label">Sub-items</div>
      <div v-for="field in subFields" :key="field.key" class="color-field">
        <div class="color-row">
          <span class="color-label">{{ field.label }}</span>
          <div class="color-controls">
            <input
              type="color"
              class="color-picker"
              :value="getHex6(field.key)"
              @input="onColorInput(field.key, $event)"
            />
            <input
              type="text"
              class="hex-input"
              :value="theme[field.key] || ''"
              placeholder="#000000"
              maxlength="9"
              @change="onHexInput(field.key, $event)"
            />
            <button
              v-if="theme[field.key]"
              class="clear-btn"
              @click="clear(field.key)"
            >&times;</button>
          </div>
        </div>
        <div v-if="theme[field.key]" class="alpha-row">
          <span class="alpha-label">Opacity</span>
          <input
            type="range"
            class="alpha-slider"
            min="0"
            max="100"
            :value="getAlpha(field.key)"
            @input="onAlphaInput(field.key, $event)"
          />
          <span class="alpha-value">{{ getAlpha(field.key) }}%</span>
        </div>
      </div>
    </template>

    <!-- Slider fill -->
    <template v-if="showSlider">
      <div class="section-label">Slider</div>
      <div v-for="field in sliderFields" :key="field.key" class="color-field">
        <div class="color-row">
          <span class="color-label">{{ field.label }}</span>
          <div class="color-controls">
            <input
              type="color"
              class="color-picker"
              :value="getHex6(field.key)"
              @input="onColorInput(field.key, $event)"
            />
            <input
              type="text"
              class="hex-input"
              :value="theme[field.key] || ''"
              placeholder="#000000"
              maxlength="9"
              @change="onHexInput(field.key, $event)"
            />
            <button
              v-if="theme[field.key]"
              class="clear-btn"
              @click="clear(field.key)"
            >&times;</button>
          </div>
        </div>
        <div v-if="theme[field.key]" class="alpha-row">
          <span class="alpha-label">Opacity</span>
          <input
            type="range"
            class="alpha-slider"
            min="0"
            max="100"
            :value="getAlpha(field.key)"
            @input="onAlphaInput(field.key, $event)"
          />
          <span class="alpha-value">{{ getAlpha(field.key) }}%</span>
        </div>
      </div>
    </template>

    <!-- Actions -->
    <div class="section-label">Actions</div>
    <div class="action-row">
      <button class="action-btn" @click="copyTheme">Copy Theme</button>
      <button class="action-btn" @click="pasteTheme">Paste Theme</button>
      <button class="action-btn" @click="resetTheme">Reset</button>
    </div>

    <button
      class="apply-all-btn"
      :class="{ confirm: confirmApplyAll }"
      @click="applyToAll"
    >
      {{ confirmApplyAll ? 'Confirm: Apply to All Widgets on Page?' : 'Apply to All Widgets on Page' }}
    </button>
  </div>
</template>

<style scoped>
.theme-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.color-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.color-label {
  font-size: 0.85rem;
  color: var(--text-primary);
  flex-shrink: 0;
}

.color-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-picker {
  width: 32px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
  cursor: pointer;
  padding: 1px;
}

.hex-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-family: monospace;
  outline: none;
}

.hex-input:focus {
  border-color: var(--accent);
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
}

.clear-btn:hover {
  color: var(--danger);
}

.alpha-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
}

.alpha-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 46px;
}

.alpha-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.alpha-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.alpha-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.alpha-value {
  font-size: 0.75rem;
  color: var(--text-secondary);
  width: 32px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.action-row {
  display: flex;
  gap: 6px;
}

.action-btn {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.action-btn:hover {
  border-color: var(--accent);
}

.apply-all-btn {
  margin-top: 4px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.apply-all-btn:hover {
  border-color: var(--accent);
}

.apply-all-btn.confirm {
  border-color: var(--danger);
  color: var(--danger);
}
</style>
