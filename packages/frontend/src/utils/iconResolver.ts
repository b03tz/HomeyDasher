import { addCollection } from "@iconify/vue";
import mdiData from "@iconify-json/mdi/icons.json";

// Register the full MDI icon set for offline use
addCollection(mdiData);

/**
 * Convert a stored icon name (e.g. "home-automation") to its
 * full Iconify icon identifier "mdi:home-automation".
 * If the name already has a prefix ("mdi:xxx"), return as-is.
 *
 * Legacy Lucide names (PascalCase) are mapped to MDI equivalents
 * on a best-effort basis.
 */
const LUCIDE_TO_MDI: Record<string, string> = {
  Home: "home",
  Zap: "flash",
  Thermometer: "thermometer",
  Lightbulb: "lightbulb",
  Lock: "lock",
  Droplet: "water",
  Wind: "weather-windy",
  Sun: "white-balance-sunny",
  Moon: "weather-night",
  Power: "power",
  Tv: "television",
  Fan: "fan",
  Speaker: "speaker",
  Camera: "camera",
  Shield: "shield",
  Bell: "bell",
  Wifi: "wifi",
  Cloud: "cloud",
  Eye: "eye",
  Flame: "fire",
  Gauge: "gauge",
  Timer: "timer",
  Clock: "clock",
  Heart: "heart",
  Star: "star",
  Settings: "cog",
  Sofa: "sofa",
  Bath: "bathtub",
  CookingPot: "pot-steam",
  Bed: "bed",
  Car: "car",
  Trees: "tree",
  Flower2: "flower",
  Dog: "dog",
  Blinds: "blinds",
  DoorOpen: "door-open",
  DoorClosed: "door-closed",
  Plug: "power-plug",
  BatteryCharging: "battery-charging",
  CircuitBoard: "circuit-board",
  SunDim: "brightness-5",
  Snowflake: "snowflake",
  CloudRain: "weather-rainy",
  Umbrella: "umbrella",
  Waves: "waves",
  Heater: "radiator",
  Microchip: "chip",
  Binary: "numeric",
  Activity: "pulse",
  BarChart3: "chart-bar",
  PieChart: "chart-pie",
  Signal: "signal",
  LayoutGrid: "view-grid",
  LayoutDashboard: "view-dashboard",
  MonitorSmartphone: "monitor-cellphone",
  Smartphone: "cellphone",
  Music: "music",
  Volume2: "volume-high",
  Cctv: "cctv",
  AlarmSmoke: "smoke-detector",
  Siren: "alarm-light",
  KeyRound: "key",
  Lamp: "lamp",
  LampDesk: "desk-lamp",
  LampFloor: "floor-lamp",
  Warehouse: "warehouse",
  Building2: "office-building",
  Store: "store",
  Sunrise: "weather-sunset-up",
  Sunset: "weather-sunset-down",
  MoonStar: "weather-night",
  CloudSun: "weather-partly-cloudy",
};

export function resolveIconName(name: string | undefined): string | null {
  if (!name) return null;

  // Already a prefixed iconify name
  if (name.includes(":")) return name;

  // Legacy Lucide PascalCase name
  const mapped = LUCIDE_TO_MDI[name];
  if (mapped) return `mdi:${mapped}`;

  // Assume it's already an MDI name
  return `mdi:${name}`;
}
