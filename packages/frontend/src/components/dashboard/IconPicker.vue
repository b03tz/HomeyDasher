<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Home, Zap, Thermometer, Lightbulb, Lock, Droplet, Wind, Sun, Moon,
  Power, Tv, Fan, Speaker, Camera, Shield, Bell, Wifi, Cloud,
  Eye, Flame, Gauge, Timer, Clock, Heart, Star, Settings,
  Sofa, Bath, CookingPot, Bed, Car, Trees, Flower2, Dog,
  Blinds, DoorOpen, DoorClosed, Plug, BatteryCharging, CircuitBoard,
  SunDim, Snowflake, CloudRain, Umbrella, Waves, Heater,
  Microchip, Binary, Activity, BarChart3, PieChart, Signal,
  LayoutGrid, LayoutDashboard, MonitorSmartphone, Smartphone,
  Music, Volume2, Cctv, AlarmSmoke, Siren, KeyRound,
  Lamp, LampDesk, LampFloor, Warehouse, Building2, Store,
  Sunrise, Sunset, MoonStar, CloudSun,
} from "lucide-vue-next";

interface IconDef {
  name: string;
  component: any;
}

const ICONS: IconDef[] = [
  { name: "Home", component: Home },
  { name: "Zap", component: Zap },
  { name: "Thermometer", component: Thermometer },
  { name: "Lightbulb", component: Lightbulb },
  { name: "Lock", component: Lock },
  { name: "Droplet", component: Droplet },
  { name: "Wind", component: Wind },
  { name: "Sun", component: Sun },
  { name: "Moon", component: Moon },
  { name: "Power", component: Power },
  { name: "Tv", component: Tv },
  { name: "Fan", component: Fan },
  { name: "Speaker", component: Speaker },
  { name: "Camera", component: Camera },
  { name: "Shield", component: Shield },
  { name: "Bell", component: Bell },
  { name: "Wifi", component: Wifi },
  { name: "Cloud", component: Cloud },
  { name: "Eye", component: Eye },
  { name: "Flame", component: Flame },
  { name: "Gauge", component: Gauge },
  { name: "Timer", component: Timer },
  { name: "Clock", component: Clock },
  { name: "Heart", component: Heart },
  { name: "Star", component: Star },
  { name: "Settings", component: Settings },
  { name: "Sofa", component: Sofa },
  { name: "Bath", component: Bath },
  { name: "CookingPot", component: CookingPot },
  { name: "Bed", component: Bed },
  { name: "Car", component: Car },
  { name: "Trees", component: Trees },
  { name: "Flower2", component: Flower2 },
  { name: "Dog", component: Dog },
  { name: "Blinds", component: Blinds },
  { name: "DoorOpen", component: DoorOpen },
  { name: "DoorClosed", component: DoorClosed },
  { name: "Plug", component: Plug },
  { name: "BatteryCharging", component: BatteryCharging },
  { name: "CircuitBoard", component: CircuitBoard },
  { name: "SunDim", component: SunDim },
  { name: "Snowflake", component: Snowflake },
  { name: "CloudRain", component: CloudRain },
  { name: "Umbrella", component: Umbrella },
  { name: "Waves", component: Waves },
  { name: "Heater", component: Heater },
  { name: "Microchip", component: Microchip },
  { name: "Binary", component: Binary },
  { name: "Activity", component: Activity },
  { name: "BarChart3", component: BarChart3 },
  { name: "PieChart", component: PieChart },
  { name: "Signal", component: Signal },
  { name: "LayoutGrid", component: LayoutGrid },
  { name: "LayoutDashboard", component: LayoutDashboard },
  { name: "MonitorSmartphone", component: MonitorSmartphone },
  { name: "Smartphone", component: Smartphone },
  { name: "Music", component: Music },
  { name: "Volume2", component: Volume2 },
  { name: "Cctv", component: Cctv },
  { name: "AlarmSmoke", component: AlarmSmoke },
  { name: "Siren", component: Siren },
  { name: "KeyRound", component: KeyRound },
  { name: "Lamp", component: Lamp },
  { name: "LampDesk", component: LampDesk },
  { name: "LampFloor", component: LampFloor },
  { name: "Warehouse", component: Warehouse },
  { name: "Building2", component: Building2 },
  { name: "Store", component: Store },
  { name: "Sunrise", component: Sunrise },
  { name: "Sunset", component: Sunset },
  { name: "MoonStar", component: MoonStar },
  { name: "CloudSun", component: CloudSun },
];

const props = defineProps<{
  modelValue?: string;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  close: [];
}>();

const search = ref("");

const filtered = computed(() => {
  if (!search.value) return ICONS;
  const q = search.value.toLowerCase();
  return ICONS.filter((i) => i.name.toLowerCase().includes(q));
});

function select(name: string) {
  emit("update:modelValue", name);
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="icon-picker-overlay" @click.self="emit('close')">
      <div class="icon-picker-modal">
        <div class="icon-picker-header">
          <h3>Pick Icon</h3>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>
        <div class="icon-picker-search">
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="Search icons..."
          />
        </div>
        <div class="icon-grid">
          <button
            v-for="icon in filtered"
            :key="icon.name"
            class="icon-cell"
            :class="{ selected: modelValue === icon.name }"
            :title="icon.name"
            @click="select(icon.name)"
          >
            <component :is="icon.component" :size="24" />
          </button>
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
  max-width: 420px;
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
}

.search-input:focus {
  border-color: var(--accent);
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

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 16px 0;
}
</style>
