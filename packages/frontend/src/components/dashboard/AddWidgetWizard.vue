<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type {
  DashboardWidget, SwitchWidget, ChartWidget, NumberWidget,
  StatusWidget, GaugeWidget, SliderWidget, KnobWidget, ButtonWidget,
  GroupStatusWidget, WeatherWidget, ClockWidget, ContainerWidget,
  LiveChartWidget, LiveChartPeriod, LiveChartUpdateInterval,
  DashboardSwitchWidget, TextWidget, EnumWidget,
  BarChartWidget, PieChartWidget, PieChartSlice, PieChartStyle, PieChartAggregation,
  MultiLineChartWidget, MultiLineChartSeries,
  CameraWidget,
  BatteryWidget, BatteryOrientation, BatteryStyle, BatterySize,
  ImageSwitchWidget,
  WidgetDeviceRef, ButtonFlowRef, NumberWidgetSize, GroupStatusMode, ClockStyle, ClockDisplay,
  StatusDisplayMode, WidgetTheme,
  SliderSize, SliderOrientation,
  SwitchDisplayMode, SwitchSize, SwitchLabelPosition,
} from "@homecontrol/shared";
import { useDashboardStore } from "../../stores/dashboard";
import { nextAvailableRow } from "../../utils/gridUtils";
import { uuid } from "../../utils/uuid";
import SwitchWidgetConfig from "./widgets/SwitchWidgetConfig.vue";
import ChartWidgetConfig from "./widgets/ChartWidgetConfig.vue";
import NumberWidgetConfig from "./widgets/NumberWidgetConfig.vue";
import StatusWidgetConfig from "./widgets/StatusWidgetConfig.vue";
import GaugeWidgetConfig from "./widgets/GaugeWidgetConfig.vue";
import SliderWidgetConfig from "./widgets/SliderWidgetConfig.vue";
import KnobWidgetConfig from "./widgets/KnobWidgetConfig.vue";
import ButtonWidgetConfig from "./widgets/ButtonWidgetConfig.vue";
import GroupStatusWidgetConfig from "./widgets/GroupStatusWidgetConfig.vue";
import WeatherWidgetConfig from "./widgets/WeatherWidgetConfig.vue";
import ClockWidgetConfig from "./widgets/ClockWidgetConfig.vue";
import ContainerWidgetConfig from "./widgets/ContainerWidgetConfig.vue";
import LiveChartWidgetConfig from "./widgets/LiveChartWidgetConfig.vue";
import DashboardSwitchWidgetConfig from "./widgets/DashboardSwitchWidgetConfig.vue";
import TextWidgetConfig from "./widgets/TextWidgetConfig.vue";
import EnumWidgetConfig from "./widgets/EnumWidgetConfig.vue";
import BarChartWidgetConfig from "./widgets/BarChartWidgetConfig.vue";
import PieChartWidgetConfig from "./widgets/PieChartWidgetConfig.vue";
import MultiLineChartWidgetConfig from "./widgets/MultiLineChartWidgetConfig.vue";
import CameraWidgetConfig from "./widgets/CameraWidgetConfig.vue";
import BatteryWidgetConfig from "./widgets/BatteryWidgetConfig.vue";
import ImageSwitchWidgetConfig from "./widgets/ImageSwitchWidgetConfig.vue";
import ContainerEditor from "./ContainerEditor.vue";
import WidgetThemeEditor from "./widgets/WidgetThemeEditor.vue";
import ImagePicker from "./ImagePicker.vue";
import { useToast } from "../../composables/useToast";
import type { BackgroundImage } from "@homecontrol/shared";

type WidgetCategory = "display" | "charts" | "control" | "utility";

interface WidgetTypeInfo {
  type: string;
  name: string;
  description: string;
  category: WidgetCategory;
}

const WIDGET_TYPES: WidgetTypeInfo[] = [
  // Display (read-only)
  { type: "number", name: "Number", description: "Live-updating single number display", category: "display" },
  { type: "status", name: "Status", description: "Binary state indicators (doors, locks)", category: "display" },
  { type: "gauge", name: "Gauge", description: "Semicircular gauge for numeric values", category: "display" },
  { type: "chart", name: "Insights Line Chart", description: "Line chart from Homey Insights logs", category: "charts" },
  { type: "live-chart", name: "Live Chart", description: "Real-time line chart from capability updates", category: "charts" },
  { type: "bar-chart", name: "Bar Chart", description: "Bar chart from Homey Insights logs", category: "charts" },
  { type: "pie-chart", name: "Pie/Doughnut", description: "Pie or doughnut from devices or Insights", category: "charts" },
  { type: "multi-line-chart", name: "Multi-Line Chart", description: "Multiple Insights logs on one chart", category: "charts" },
  { type: "group-status", name: "Group Status", description: "Aggregate count, all-off check, or sum", category: "display" },
  { type: "weather", name: "Weather", description: "Multi-value weather from a device", category: "display" },
  // Control (settable)
  { type: "switch", name: "Switch", description: "Toggle on/off devices", category: "control" },
  { type: "slider", name: "Slider", description: "Dimmers, temperature, etc.", category: "control" },
  { type: "knob", name: "Knob", description: "Rotary dial for touchscreen control", category: "control" },
  { type: "button", name: "Flow Button", description: "Trigger Homey flows with a tap", category: "control" },
  { type: "enum", name: "Enum", description: "Select from device modes & options", category: "control" },
  // Utility
  { type: "clock", name: "Clock", description: "Analog or digital clock with date", category: "display" },
  { type: "text", name: "Text", description: "Static text, HTML, or empty spacer", category: "utility" },
  { type: "container", name: "Container", description: "Group widgets in a nested mini-grid", category: "utility" },
  { type: "dashboard-switch", name: "Dashboard Switch", description: "Quick-switch to another dashboard", category: "utility" },
  { type: "camera", name: "Camera", description: "Live RTSP stream via go2rtc", category: "display" },
  { type: "battery", name: "Battery", description: "Battery / level indicator with bars or fill", category: "display" },
  { type: "image-switch", name: "Image Switch", description: "Toggle with custom on/off images", category: "control" },
];

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  display: "Display",
  charts: "Charts",
  control: "Control",
  utility: "Utility",
};

const CATEGORY_ICONS: Record<WidgetCategory, string> = {
  display: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>`,
  charts: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="4" x2="4" y2="20"/><line x1="4" y1="20" x2="20" y2="20"/><polyline points="7,16 11,10 15,14 20,6"/>
  </svg>`,
  control: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  utility: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>`,
};

const CATEGORIES: WidgetCategory[] = ["display", "charts", "control", "utility"];

const activeTab = ref<WidgetCategory>("display");

/* Blueprint-style SVG previews keyed by widget type */
const WIDGET_SVGS: Record<string, string> = {
  switch: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="10" width="48" height="20" rx="10" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <circle cx="42" cy="20" r="7" fill="currentColor" opacity="0.7"/>
  </svg>`,
  chart: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="6" x2="10" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="10" y1="34" x2="56" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <polyline points="14,28 22,22 30,26 38,14 46,18 54,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  </svg>`,
  number: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="32" y="27" text-anchor="middle" font-family="system-ui" font-size="20" font-weight="700" fill="currentColor" opacity="0.8">42</text>
    <text x="32" y="36" text-anchor="middle" font-family="system-ui" font-size="7" fill="currentColor" opacity="0.35">\u00b0C</text>
  </svg>`,
  status: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.7"/>
    <circle cx="44" cy="20" r="6" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="16" y1="32" x2="24" y2="32" stroke="currentColor" stroke-width="1" opacity="0.25"/>
    <line x1="40" y1="32" x2="48" y2="32" stroke="currentColor" stroke-width="1" opacity="0.25"/>
  </svg>`,
  gauge: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 12 34 A 20 20 0 0 1 52 34" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.25"/>
    <line x1="32" y1="34" x2="20" y2="17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
    <circle cx="32" cy="34" r="3.5" fill="currentColor" opacity="0.7"/>
  </svg>`,
  slider: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="18" width="48" height="4" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="8" y="18" width="30" height="4" rx="2" fill="currentColor" opacity="0.6"/>
    <circle cx="38" cy="20" r="6" fill="currentColor" opacity="0.8"/>
  </svg>`,
  knob: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="20" r="14" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <circle cx="32" cy="20" r="10" stroke="currentColor" stroke-width="2" opacity="0.5"/>
    <line x1="32" y1="20" x2="32" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  </svg>`,
  button: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="8" width="40" height="24" rx="6" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <polygon points="28,14 28,26 40,20" fill="currentColor" opacity="0.6"/>
  </svg>`,
  "group-status": `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="16" r="4" fill="currentColor" opacity="0.7"/>
    <circle cx="28" cy="16" r="4" fill="currentColor" opacity="0.5"/>
    <circle cx="42" cy="16" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="32" y="34" text-anchor="middle" font-family="system-ui" font-size="8" font-weight="600" fill="currentColor" opacity="0.4">2/3</text>
  </svg>`,
  weather: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="16" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
    <line x1="26" y1="5" x2="26" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    <line x1="26" y1="29" x2="26" y2="27" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    <line x1="15" y1="16" x2="13" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    <line x1="37" y1="16" x2="39" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M36 26 A8 8 0 0 1 52 26" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="34" y1="26" x2="54" y2="26" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <text x="32" y="38" text-anchor="middle" font-family="system-ui" font-size="7" fill="currentColor" opacity="0.35">21\u00b0</text>
  </svg>`,
  clock: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="20" r="15" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="32" y1="20" x2="32" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <line x1="32" y1="20" x2="40" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <circle cx="32" cy="20" r="1.5" fill="currentColor" opacity="0.7"/>
  </svg>`,
  "live-chart": `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="6" x2="10" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="10" y1="34" x2="56" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <polyline points="14,24 20,26 26,20 32,22 38,14 44,18 50,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
    <circle cx="50" cy="12" r="3" fill="currentColor" opacity="0.9"/>
  </svg>`,
  container: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="52" height="32" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <rect x="10" y="8" width="20" height="12" rx="2" stroke="currentColor" stroke-width="1" opacity="0.5"/>
    <rect x="34" y="8" width="20" height="12" rx="2" stroke="currentColor" stroke-width="1" opacity="0.5"/>
    <rect x="10" y="24" width="44" height="8" rx="2" stroke="currentColor" stroke-width="1" opacity="0.5"/>
  </svg>`,
  text: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="12" x2="44" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <line x1="10" y1="20" x2="54" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <line x1="10" y1="28" x2="36" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
  </svg>`,
  enum: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="6" width="40" height="10" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <rect x="12" y="15" width="40" height="10" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
    <rect x="12" y="24" width="40" height="10" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <circle cx="48" cy="20" r="2.5" fill="currentColor" opacity="0.7"/>
  </svg>`,
  "dashboard-switch": `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="6" width="48" height="28" rx="4" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <rect x="14" y="12" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
    <polyline points="40,16 46,20 40,24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
  </svg>`,
  "bar-chart": `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="6" x2="10" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="10" y1="34" x2="56" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <rect x="14" y="22" width="6" height="12" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="23" y="14" width="6" height="20" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="32" y="18" width="6" height="16" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="41" y="10" width="6" height="24" rx="1" fill="currentColor" opacity="0.8"/>
    <rect x="50" y="16" width="6" height="18" rx="1" fill="currentColor" opacity="0.6"/>
  </svg>`,
  "pie-chart": `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="20" r="15" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <path d="M32 5 A15 15 0 0 1 47 20 L32 20 Z" fill="currentColor" opacity="0.7"/>
    <path d="M47 20 A15 15 0 0 1 32 35 L32 20 Z" fill="currentColor" opacity="0.4"/>
    <path d="M32 35 A15 15 0 0 1 17 20 L32 20 Z" fill="currentColor" opacity="0.55"/>
  </svg>`,
  "multi-line-chart": `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="6" x2="10" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="10" y1="34" x2="56" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <polyline points="14,28 22,22 30,26 38,14 46,18 54,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
    <polyline points="14,20 22,24 30,18 38,22 46,12 54,16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>
  </svg>`,
  camera: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" transform="translate(12,10) scale(1.6)" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
    <circle cx="32" cy="22" r="5" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
  </svg>`,
  battery: `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="10" width="40" height="20" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <rect x="48" y="15" width="6" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <rect x="12" y="14" width="8" height="12" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="22" y="14" width="8" height="12" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="32" y="14" width="8" height="12" rx="1" fill="currentColor" opacity="0.3"/>
  </svg>`,
  "image-switch": `<svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="24" height="32" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <rect x="34" y="4" width="24" height="32" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
    <circle cx="18" cy="16" r="5" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    <line x1="14" y1="16" x2="22" y2="16" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <circle cx="46" cy="16" r="5" stroke="currentColor" stroke-width="1" opacity="0.6"/>
    <line x1="46" y1="12" x2="46" y2="20" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
    <line x1="42" y1="16" x2="50" y2="16" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
    <text x="18" y="30" text-anchor="middle" font-family="system-ui" font-size="6" fill="currentColor" opacity="0.3">OFF</text>
    <text x="46" y="30" text-anchor="middle" font-family="system-ui" font-size="6" fill="currentColor" opacity="0.6">ON</text>
  </svg>`,
};

const props = defineProps<{
  open: boolean;
  editWidget?: DashboardWidget | null;
  excludeTypes?: string[];
  externalMode?: boolean;
  zIndex?: number;
}>();

const emit = defineEmits<{
  close: [];
  saveWidget: [widget: DashboardWidget];
  deleteWidget: [widgetId: string];
}>();

const filteredTypes = computed(() => {
  if (!props.excludeTypes?.length) return WIDGET_TYPES;
  return WIDGET_TYPES.filter((wt) => !props.excludeTypes!.includes(wt.type));
});

const dashboardStore = useDashboardStore();
const toast = useToast();

const step = ref(1);
const selectedType = ref<string>("");
const title = ref("");
const hideTitle = ref(false);

// Switch state
const switchDevices = ref<WidgetDeviceRef[]>([]);
const switchDisplayMode = ref<SwitchDisplayMode>("button");
const switchSize = ref<SwitchSize>("medium");
const switchLabelPosition = ref<SwitchLabelPosition>("right");

// Chart state
const chartLogId = ref("");
const chartResolution = ref("last24Hours");
const chartUnit = ref("");
const chartMultiplier = ref(1);
const chartColor = ref("#4fc3f7");
const chartHideXAxis = ref(false);
const chartSecondaryLogId = ref("");
const chartSecondaryUnit = ref("");
const chartSecondaryMultiplier = ref(1);
const chartSecondaryColor = ref("#ffb74d");

// Number state
const numberDeviceId = ref("");
const numberCapabilityId = ref("");
const numberUnit = ref("");
const numberMultiplier = ref(1);
const numberSize = ref<NumberWidgetSize>("medium");

// Status state
const statusDevices = ref<{ deviceId: string; capabilityId: string }[]>([]);
const statusReverseColors = ref(false);
const statusDisplayMode = ref<StatusDisplayMode>("led-list");

// Gauge state
const gaugeDeviceId = ref("");
const gaugeCapabilityId = ref("");
const gaugeUnit = ref("");
const gaugeMultiplier = ref(1);
const gaugeMin = ref<number | undefined>(undefined);
const gaugeMax = ref<number | undefined>(undefined);
const gaugeWarning = ref<number | undefined>(undefined);
const gaugeDanger = ref<number | undefined>(undefined);

// Slider state
const sliderDeviceId = ref("");
const sliderCapabilityId = ref("");
const sliderUnit = ref("");
const sliderMin = ref<number | undefined>(undefined);
const sliderMax = ref<number | undefined>(undefined);
const sliderStep = ref<number | undefined>(undefined);
const sliderSize = ref<SliderSize>("medium");
const sliderOrientation = ref<SliderOrientation>("horizontal");
const sliderHideValue = ref(false);

// Knob state
const knobDeviceId = ref("");
const knobCapabilityId = ref("");
const knobUnit = ref("");
const knobMin = ref<number | undefined>(undefined);
const knobMax = ref<number | undefined>(undefined);
const knobStep = ref<number | undefined>(undefined);

// Button state
const buttonFlows = ref<ButtonFlowRef[]>([]);

// Group status state
const groupDevices = ref<{ deviceId: string; capabilityId: string }[]>([]);
const groupMode = ref<GroupStatusMode>("count");
const groupUnit = ref("");
const groupMultiplier = ref(1);

// Weather state
const weatherDeviceId = ref("");

// Clock state
const clockStyle = ref<ClockStyle>("digital");
const clockDisplay = ref<ClockDisplay>("both");
const clockShowSeconds = ref(false);
const clockUse24Hour = ref(true);

// Live chart state
const liveChartDeviceId = ref("");
const liveChartCapabilityId = ref("");
const liveChartPeriod = ref<LiveChartPeriod>("last5Min");
const liveChartUpdateInterval = ref<LiveChartUpdateInterval>("live");
const liveChartUnit = ref("");
const liveChartMultiplier = ref(1);
const liveChartColor = ref("#4fc3f7");
const liveChartNegativeColor = ref("#ef5350");
const liveChartHideXAxis = ref(false);
const chartDecimals = ref<number | undefined>(undefined);
const numberDecimals = ref<number | undefined>(undefined);
const gaugeDecimals = ref<number | undefined>(undefined);
const liveChartDecimals = ref<number | undefined>(undefined);

const liveChartSecondaryDeviceId = ref("");
const liveChartSecondaryCapabilityId = ref("");
const liveChartSecondaryUnit = ref("");
const liveChartSecondaryMultiplier = ref(1);
const liveChartSecondaryColor = ref("#ffb74d");
const liveChartSecondaryNegativeColor = ref("#ef5350");

// Container state
const containerGridColumns = ref(3);
const containerGridRows = ref(2);
const containerWidgets = ref<DashboardWidget[]>([]);
const containerEditorOpen = ref(false);

// Text state
const textContent = ref("");
const textHtml = ref(false);

// Enum state
const enumDeviceId = ref("");
const enumCapabilityId = ref("");
const enumDisplayMode = ref<"popup" | "scroll">("popup");

// Bar chart state (reuses chart pattern)
const barChartLogId = ref("");
const barChartResolution = ref("last24Hours");
const barChartUnit = ref("");
const barChartMultiplier = ref(1);
const barChartColor = ref("#4fc3f7");
const barChartHideXAxis = ref(false);
const barChartDecimals = ref<number | undefined>(undefined);
const barChartSecondaryLogId = ref("");
const barChartSecondaryUnit = ref("");
const barChartSecondaryMultiplier = ref(1);
const barChartSecondaryColor = ref("#ffb74d");

// Pie chart state
const pieSlices = ref<PieChartSlice[]>([]);
const pieStyle = ref<PieChartStyle>("pie");
const pieUnit = ref("");
const pieMultiplier = ref(1);
const pieDecimals = ref<number | undefined>(undefined);
const pieResolution = ref<string | undefined>(undefined);
const pieAggregation = ref<PieChartAggregation | undefined>(undefined);

// Multi-line chart state
const multiLineSeries = ref<MultiLineChartSeries[]>([]);
const multiLineResolution = ref("last24Hours");
const multiLineHideXAxis = ref(false);
const multiLineDecimals = ref<number | undefined>(undefined);

// Battery state
const batteryDeviceId = ref("");
const batteryCapabilityId = ref("");
const batteryOrientation = ref<BatteryOrientation>("horizontal");
const batteryStyle = ref<BatteryStyle>("bars");
const batterySize = ref<BatterySize>("medium");
const batteryColor = ref("#4fc3f7");
const batteryUnit = ref("");
const batteryMultiplier = ref(1);
const batteryMin = ref<number | undefined>(undefined);
const batteryMax = ref<number | undefined>(undefined);
const batteryDecimals = ref<number | undefined>(undefined);

// Image switch state
const imgSwitchDeviceId = ref("");
const imgSwitchCapabilityId = ref("");
const imgSwitchOnImage = ref("");
const imgSwitchOffImage = ref("");
const imgSwitchChromeless = ref(false);

// Camera state
const cameraRtspUrl = ref("");

// Dashboard switch state
const dashSwitchTargetId = ref("");

// Move widget state
const movePopupOpen = ref(false);

// Theme state
const configTab = ref<"config" | "theme">("config");
const widgetTheme = ref<WidgetTheme>({});

// Background image state
const widgetBgImage = ref<BackgroundImage | undefined>(undefined);
const bgPickerOpen = ref(false);

function resetAll() {
  hideTitle.value = false;
  switchDevices.value = [];
  switchDisplayMode.value = "button";
  switchSize.value = "medium";
  switchLabelPosition.value = "right";
  chartLogId.value = "";
  chartResolution.value = "last24Hours";
  chartUnit.value = "";
  chartMultiplier.value = 1;
  chartColor.value = "#4fc3f7";
  chartHideXAxis.value = false;
  chartDecimals.value = undefined;
  chartSecondaryLogId.value = "";
  chartSecondaryUnit.value = "";
  chartSecondaryMultiplier.value = 1;
  chartSecondaryColor.value = "#ffb74d";
  numberDeviceId.value = "";
  numberCapabilityId.value = "";
  numberUnit.value = "";
  numberMultiplier.value = 1;
  numberSize.value = "medium";
  numberDecimals.value = undefined;
  statusDevices.value = [];
  statusReverseColors.value = false;
  statusDisplayMode.value = "led-list";
  gaugeDeviceId.value = "";
  gaugeCapabilityId.value = "";
  gaugeUnit.value = "";
  gaugeMultiplier.value = 1;
  gaugeMin.value = undefined;
  gaugeMax.value = undefined;
  gaugeWarning.value = undefined;
  gaugeDanger.value = undefined;
  gaugeDecimals.value = undefined;
  sliderDeviceId.value = "";
  sliderCapabilityId.value = "";
  sliderUnit.value = "";
  sliderMin.value = undefined;
  sliderMax.value = undefined;
  sliderStep.value = undefined;
  sliderSize.value = "medium";
  sliderOrientation.value = "horizontal";
  sliderHideValue.value = false;
  knobDeviceId.value = "";
  knobCapabilityId.value = "";
  knobUnit.value = "";
  knobMin.value = undefined;
  knobMax.value = undefined;
  knobStep.value = undefined;
  buttonFlows.value = [];
  groupDevices.value = [];
  groupMode.value = "count";
  groupUnit.value = "";
  groupMultiplier.value = 1;
  weatherDeviceId.value = "";
  clockStyle.value = "digital";
  clockDisplay.value = "both";
  clockShowSeconds.value = false;
  clockUse24Hour.value = true;
  liveChartDeviceId.value = "";
  liveChartCapabilityId.value = "";
  liveChartPeriod.value = "last5Min";
  liveChartUpdateInterval.value = "live";
  liveChartUnit.value = "";
  liveChartMultiplier.value = 1;
  liveChartColor.value = "#4fc3f7";
  liveChartNegativeColor.value = "#ef5350";
  liveChartHideXAxis.value = false;
  liveChartDecimals.value = undefined;
  liveChartSecondaryDeviceId.value = "";
  liveChartSecondaryCapabilityId.value = "";
  liveChartSecondaryUnit.value = "";
  liveChartSecondaryMultiplier.value = 1;
  liveChartSecondaryColor.value = "#ffb74d";
  liveChartSecondaryNegativeColor.value = "#ef5350";
  containerGridColumns.value = 3;
  containerGridRows.value = 2;
  containerWidgets.value = [];
  containerEditorOpen.value = false;
  textContent.value = "";
  textHtml.value = false;
  enumDeviceId.value = "";
  enumCapabilityId.value = "";
  enumDisplayMode.value = "popup";
  barChartLogId.value = "";
  barChartResolution.value = "last24Hours";
  barChartUnit.value = "";
  barChartMultiplier.value = 1;
  barChartColor.value = "#4fc3f7";
  barChartHideXAxis.value = false;
  barChartDecimals.value = undefined;
  barChartSecondaryLogId.value = "";
  barChartSecondaryUnit.value = "";
  barChartSecondaryMultiplier.value = 1;
  barChartSecondaryColor.value = "#ffb74d";
  pieSlices.value = [];
  pieStyle.value = "pie";
  pieUnit.value = "";
  pieMultiplier.value = 1;
  pieDecimals.value = undefined;
  pieResolution.value = undefined;
  pieAggregation.value = undefined;
  multiLineSeries.value = [];
  multiLineResolution.value = "last24Hours";
  multiLineHideXAxis.value = false;
  multiLineDecimals.value = undefined;
  batteryDeviceId.value = "";
  batteryCapabilityId.value = "";
  batteryOrientation.value = "horizontal";
  batteryStyle.value = "bars";
  batterySize.value = "medium";
  batteryColor.value = "#4fc3f7";
  batteryUnit.value = "";
  batteryMultiplier.value = 1;
  batteryMin.value = undefined;
  batteryMax.value = undefined;
  batteryDecimals.value = undefined;
  imgSwitchDeviceId.value = "";
  imgSwitchCapabilityId.value = "";
  imgSwitchOnImage.value = "";
  imgSwitchOffImage.value = "";
  imgSwitchChromeless.value = false;
  cameraRtspUrl.value = "";
  dashSwitchTargetId.value = "";
  configTab.value = "config";
  widgetTheme.value = {};
  widgetBgImage.value = undefined;
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return;

  if (props.editWidget) {
    step.value = 2;
    selectedType.value = props.editWidget.type;
    title.value = props.editWidget.title;
    hideTitle.value = !!props.editWidget.hideTitle;
    widgetTheme.value = props.editWidget.theme ? { ...props.editWidget.theme } : {};
    widgetBgImage.value = props.editWidget.backgroundImage ? { ...props.editWidget.backgroundImage } : undefined;
    configTab.value = "config";

    if (props.editWidget.type === "switch") {
      switchDevices.value = [...props.editWidget.config.devices];
      switchDisplayMode.value = props.editWidget.config.displayMode ?? "button";
      switchSize.value = props.editWidget.config.size ?? "medium";
      switchLabelPosition.value = props.editWidget.config.labelPosition ?? "right";
    } else if (props.editWidget.type === "chart") {
      chartLogId.value = props.editWidget.config.logId;
      chartResolution.value = props.editWidget.config.resolution;
      chartUnit.value = props.editWidget.config.unit ?? "";
      chartMultiplier.value = props.editWidget.config.multiplier ?? 1;
      chartColor.value = props.editWidget.config.color ?? "#4fc3f7";
      chartHideXAxis.value = props.editWidget.config.hideXAxis ?? false;
      chartDecimals.value = props.editWidget.config.decimals;
      chartSecondaryLogId.value = props.editWidget.config.secondary?.logId ?? "";
      chartSecondaryUnit.value = props.editWidget.config.secondary?.unit ?? "";
      chartSecondaryMultiplier.value = props.editWidget.config.secondary?.multiplier ?? 1;
      chartSecondaryColor.value = props.editWidget.config.secondary?.color ?? "#ffb74d";
    } else if (props.editWidget.type === "number") {
      numberDeviceId.value = props.editWidget.config.deviceId;
      numberCapabilityId.value = props.editWidget.config.capabilityId;
      numberUnit.value = props.editWidget.config.unit;
      numberMultiplier.value = props.editWidget.config.multiplier;
      numberSize.value = props.editWidget.config.size;
      numberDecimals.value = props.editWidget.config.decimals;
    } else if (props.editWidget.type === "status") {
      statusDevices.value = [...props.editWidget.config.devices];
      statusReverseColors.value = props.editWidget.config.reverseColors ?? false;
      const rawMode = props.editWidget.config.displayMode;
      statusDisplayMode.value = rawMode === "columns" ? "columns" : "led-list";
    } else if (props.editWidget.type === "gauge") {
      gaugeDeviceId.value = props.editWidget.config.deviceId;
      gaugeCapabilityId.value = props.editWidget.config.capabilityId;
      gaugeUnit.value = props.editWidget.config.unit ?? "";
      gaugeMultiplier.value = props.editWidget.config.multiplier ?? 1;
      gaugeMin.value = props.editWidget.config.min;
      gaugeMax.value = props.editWidget.config.max;
      gaugeWarning.value = props.editWidget.config.thresholds?.warning;
      gaugeDanger.value = props.editWidget.config.thresholds?.danger;
      gaugeDecimals.value = props.editWidget.config.decimals;
    } else if (props.editWidget.type === "slider") {
      sliderDeviceId.value = props.editWidget.config.deviceId;
      sliderCapabilityId.value = props.editWidget.config.capabilityId;
      sliderUnit.value = props.editWidget.config.unit ?? "";
      sliderMin.value = props.editWidget.config.min;
      sliderMax.value = props.editWidget.config.max;
      sliderStep.value = props.editWidget.config.step;
      sliderSize.value = props.editWidget.config.size ?? "medium";
      sliderOrientation.value = props.editWidget.config.orientation ?? "horizontal";
      sliderHideValue.value = props.editWidget.config.hideValue ?? false;
    } else if (props.editWidget.type === "knob") {
      knobDeviceId.value = props.editWidget.config.deviceId;
      knobCapabilityId.value = props.editWidget.config.capabilityId;
      knobUnit.value = props.editWidget.config.unit ?? "";
      knobMin.value = props.editWidget.config.min;
      knobMax.value = props.editWidget.config.max;
      knobStep.value = props.editWidget.config.step;
    } else if (props.editWidget.type === "button") {
      buttonFlows.value = [...props.editWidget.config.flows];
    } else if (props.editWidget.type === "group-status") {
      groupDevices.value = [...props.editWidget.config.devices];
      groupMode.value = props.editWidget.config.mode;
      groupUnit.value = props.editWidget.config.unit ?? "";
      groupMultiplier.value = props.editWidget.config.multiplier ?? 1;
    } else if (props.editWidget.type === "weather") {
      weatherDeviceId.value = props.editWidget.config.deviceId;
    } else if (props.editWidget.type === "clock") {
      clockStyle.value = props.editWidget.config.style;
      clockDisplay.value = props.editWidget.config.display;
      clockShowSeconds.value = props.editWidget.config.showSeconds ?? false;
      clockUse24Hour.value = props.editWidget.config.use24Hour ?? true;
    } else if (props.editWidget.type === "live-chart") {
      liveChartDeviceId.value = props.editWidget.config.deviceId;
      liveChartCapabilityId.value = props.editWidget.config.capabilityId;
      liveChartPeriod.value = props.editWidget.config.period;
      liveChartUpdateInterval.value = props.editWidget.config.updateInterval ?? "live";
      liveChartUnit.value = props.editWidget.config.unit ?? "";
      liveChartMultiplier.value = props.editWidget.config.multiplier ?? 1;
      liveChartColor.value = props.editWidget.config.color ?? "#4fc3f7";
      liveChartNegativeColor.value = props.editWidget.config.negativeColor ?? "#ef5350";
      liveChartHideXAxis.value = props.editWidget.config.hideXAxis ?? false;
      liveChartDecimals.value = props.editWidget.config.decimals;
      liveChartSecondaryDeviceId.value = props.editWidget.config.secondary?.deviceId ?? "";
      liveChartSecondaryCapabilityId.value = props.editWidget.config.secondary?.capabilityId ?? "";
      liveChartSecondaryUnit.value = props.editWidget.config.secondary?.unit ?? "";
      liveChartSecondaryMultiplier.value = props.editWidget.config.secondary?.multiplier ?? 1;
      liveChartSecondaryColor.value = props.editWidget.config.secondary?.color ?? "#ffb74d";
      liveChartSecondaryNegativeColor.value = props.editWidget.config.secondary?.negativeColor ?? "#ef5350";
    } else if (props.editWidget.type === "container") {
      containerGridColumns.value = props.editWidget.config.gridColumns;
      containerGridRows.value = props.editWidget.config.gridRows;
      containerWidgets.value = JSON.parse(JSON.stringify(props.editWidget.config.widgets));
    } else if (props.editWidget.type === "text") {
      textContent.value = props.editWidget.config.content ?? "";
      textHtml.value = props.editWidget.config.html ?? false;
    } else if (props.editWidget.type === "enum") {
      enumDeviceId.value = props.editWidget.config.deviceId;
      enumCapabilityId.value = props.editWidget.config.capabilityId;
      enumDisplayMode.value = props.editWidget.config.displayMode ?? "popup";
    } else if (props.editWidget.type === "dashboard-switch") {
      dashSwitchTargetId.value = props.editWidget.config.targetDashboardId;
    } else if (props.editWidget.type === "bar-chart") {
      barChartLogId.value = props.editWidget.config.logId;
      barChartResolution.value = props.editWidget.config.resolution;
      barChartUnit.value = props.editWidget.config.unit ?? "";
      barChartMultiplier.value = props.editWidget.config.multiplier ?? 1;
      barChartColor.value = props.editWidget.config.color ?? "#4fc3f7";
      barChartHideXAxis.value = props.editWidget.config.hideXAxis ?? false;
      barChartDecimals.value = props.editWidget.config.decimals;
      barChartSecondaryLogId.value = props.editWidget.config.secondary?.logId ?? "";
      barChartSecondaryUnit.value = props.editWidget.config.secondary?.unit ?? "";
      barChartSecondaryMultiplier.value = props.editWidget.config.secondary?.multiplier ?? 1;
      barChartSecondaryColor.value = props.editWidget.config.secondary?.color ?? "#ffb74d";
    } else if (props.editWidget.type === "pie-chart") {
      pieSlices.value = props.editWidget.config.slices.map((s) => ({ ...s }));
      pieStyle.value = props.editWidget.config.style;
      pieUnit.value = props.editWidget.config.unit ?? "";
      pieMultiplier.value = props.editWidget.config.multiplier ?? 1;
      pieDecimals.value = props.editWidget.config.decimals;
      pieResolution.value = props.editWidget.config.resolution;
      pieAggregation.value = props.editWidget.config.aggregation;
    } else if (props.editWidget.type === "multi-line-chart") {
      multiLineSeries.value = props.editWidget.config.series.map((s) => ({ ...s }));
      multiLineResolution.value = props.editWidget.config.resolution;
      multiLineHideXAxis.value = props.editWidget.config.hideXAxis ?? false;
      multiLineDecimals.value = props.editWidget.config.decimals;
    } else if (props.editWidget.type === "camera") {
      cameraRtspUrl.value = props.editWidget.config.rtspUrl;
    } else if (props.editWidget.type === "battery") {
      batteryDeviceId.value = props.editWidget.config.deviceId;
      batteryCapabilityId.value = props.editWidget.config.capabilityId;
      batteryOrientation.value = props.editWidget.config.orientation ?? "horizontal";
      batteryStyle.value = props.editWidget.config.style ?? "bars";
      batterySize.value = props.editWidget.config.size ?? "medium";
      batteryColor.value = props.editWidget.config.color ?? "#4fc3f7";
      batteryUnit.value = props.editWidget.config.unit ?? "";
      batteryMultiplier.value = props.editWidget.config.multiplier ?? 1;
      batteryMin.value = props.editWidget.config.min;
      batteryMax.value = props.editWidget.config.max;
      batteryDecimals.value = props.editWidget.config.decimals;
    } else if (props.editWidget.type === "image-switch") {
      imgSwitchDeviceId.value = props.editWidget.config.deviceId;
      imgSwitchCapabilityId.value = props.editWidget.config.capabilityId;
      imgSwitchOnImage.value = props.editWidget.config.onImage;
      imgSwitchOffImage.value = props.editWidget.config.offImage;
      imgSwitchChromeless.value = props.editWidget.config.chromeless ?? false;
    }
  } else {
    step.value = 1;
    selectedType.value = "";
    title.value = "";
    resetAll();
  }
});

function pickType(type: string) {
  selectedType.value = type;
  step.value = 2;
}

function goBack() {
  if (props.editWidget) {
    emit("close");
  } else {
    step.value = 1;
  }
}

function buildWidget(): DashboardWidget | null {
  const defaultRow = props.externalMode
    ? nextAvailableRow(containerWidgets.value)
    : dashboardStore.nextAvailableRow();
  const hasTheme = Object.keys(widgetTheme.value).length > 0;
  const base = {
    id: props.editWidget?.id ?? uuid(),
    title: title.value.trim(),
    hideTitle: hideTitle.value || undefined,
    position: props.editWidget?.position ?? { col: 1, row: defaultRow },
    theme: hasTheme ? { ...widgetTheme.value } : undefined,
    backgroundImage: widgetBgImage.value,
  };

  switch (selectedType.value) {
    case "switch":
      return { ...base, type: "switch", config: { devices: switchDevices.value, displayMode: switchDisplayMode.value !== "button" ? switchDisplayMode.value : undefined, size: switchSize.value !== "medium" ? switchSize.value : undefined, labelPosition: switchLabelPosition.value !== "right" ? switchLabelPosition.value : undefined } } as SwitchWidget;

    case "chart": {
      const chartConfig: ChartWidget["config"] = {
        logId: chartLogId.value,
        resolution: chartResolution.value as ChartWidget["config"]["resolution"],
        unit: chartUnit.value || undefined,
        multiplier: chartMultiplier.value !== 1 ? chartMultiplier.value : undefined,
        color: chartColor.value !== "#4fc3f7" ? chartColor.value : undefined,
        hideXAxis: chartHideXAxis.value || undefined,
        decimals: chartDecimals.value,
      };
      if (chartSecondaryLogId.value && chartSecondaryLogId.value !== "__pending__") {
        chartConfig.secondary = {
          logId: chartSecondaryLogId.value,
          unit: chartSecondaryUnit.value || undefined,
          multiplier: chartSecondaryMultiplier.value !== 1 ? chartSecondaryMultiplier.value : undefined,
          color: chartSecondaryColor.value !== "#ffb74d" ? chartSecondaryColor.value : undefined,
        };
      }
      return { ...base, type: "chart", config: chartConfig } as ChartWidget;
    }

    case "number":
      return { ...base, type: "number", config: { deviceId: numberDeviceId.value, capabilityId: numberCapabilityId.value, unit: numberUnit.value, multiplier: numberMultiplier.value, size: numberSize.value, decimals: numberDecimals.value } } as NumberWidget;

    case "status":
      return { ...base, type: "status", config: { devices: statusDevices.value, reverseColors: statusReverseColors.value || undefined, displayMode: statusDisplayMode.value } } as StatusWidget;

    case "gauge": {
      const thresholds = (gaugeWarning.value != null || gaugeDanger.value != null)
        ? { warning: gaugeWarning.value, danger: gaugeDanger.value }
        : undefined;
      return { ...base, type: "gauge", config: { deviceId: gaugeDeviceId.value, capabilityId: gaugeCapabilityId.value, unit: gaugeUnit.value || undefined, multiplier: gaugeMultiplier.value !== 1 ? gaugeMultiplier.value : undefined, min: gaugeMin.value, max: gaugeMax.value, thresholds, decimals: gaugeDecimals.value } } as GaugeWidget;
    }

    case "slider":
      return { ...base, type: "slider", config: { deviceId: sliderDeviceId.value, capabilityId: sliderCapabilityId.value, unit: sliderUnit.value || undefined, min: sliderMin.value, max: sliderMax.value, step: sliderStep.value, size: sliderSize.value !== "medium" ? sliderSize.value : undefined, orientation: sliderOrientation.value !== "horizontal" ? sliderOrientation.value : undefined, hideValue: sliderHideValue.value || undefined } } as SliderWidget;

    case "knob":
      return { ...base, type: "knob", config: { deviceId: knobDeviceId.value, capabilityId: knobCapabilityId.value, unit: knobUnit.value || undefined, min: knobMin.value, max: knobMax.value, step: knobStep.value } } as KnobWidget;

    case "button":
      return { ...base, type: "button", config: { flows: buttonFlows.value } } as ButtonWidget;

    case "group-status":
      return { ...base, type: "group-status", config: { devices: groupDevices.value, mode: groupMode.value, unit: groupUnit.value || undefined, multiplier: groupMultiplier.value !== 1 ? groupMultiplier.value : undefined } } as GroupStatusWidget;

    case "weather":
      return { ...base, type: "weather", config: { deviceId: weatherDeviceId.value } } as WeatherWidget;

    case "clock":
      return { ...base, type: "clock", config: { style: clockStyle.value, display: clockDisplay.value, showSeconds: clockShowSeconds.value || undefined, use24Hour: clockUse24Hour.value } } as ClockWidget;

    case "live-chart": {
      const lcConfig: LiveChartWidget["config"] = {
        deviceId: liveChartDeviceId.value,
        capabilityId: liveChartCapabilityId.value,
        period: liveChartPeriod.value,
        updateInterval: liveChartUpdateInterval.value !== "live" ? liveChartUpdateInterval.value : undefined,
        unit: liveChartUnit.value || undefined,
        multiplier: liveChartMultiplier.value !== 1 ? liveChartMultiplier.value : undefined,
        color: liveChartColor.value !== "#4fc3f7" ? liveChartColor.value : undefined,
        negativeColor: liveChartNegativeColor.value !== "#ef5350" ? liveChartNegativeColor.value : undefined,
        hideXAxis: liveChartHideXAxis.value || undefined,
        decimals: liveChartDecimals.value,
      };
      if (liveChartSecondaryDeviceId.value && liveChartSecondaryDeviceId.value !== "__pending__") {
        lcConfig.secondary = {
          deviceId: liveChartSecondaryDeviceId.value,
          capabilityId: liveChartSecondaryCapabilityId.value,
          unit: liveChartSecondaryUnit.value || undefined,
          multiplier: liveChartSecondaryMultiplier.value !== 1 ? liveChartSecondaryMultiplier.value : undefined,
          color: liveChartSecondaryColor.value !== "#ffb74d" ? liveChartSecondaryColor.value : undefined,
          negativeColor: liveChartSecondaryNegativeColor.value !== "#ef5350" ? liveChartSecondaryNegativeColor.value : undefined,
        };
      }
      return { ...base, type: "live-chart", config: lcConfig } as LiveChartWidget;
    }

    case "container":
      return {
        ...base,
        type: "container",
        config: {
          gridColumns: containerGridColumns.value,
          gridRows: containerGridRows.value,
          widgets: containerWidgets.value.filter((w) => w.type !== "container"),
        },
      } as ContainerWidget;

    case "text":
      return { ...base, type: "text", config: { content: textContent.value || undefined, html: textHtml.value || undefined } } as TextWidget;

    case "enum":
      return { ...base, type: "enum", config: { deviceId: enumDeviceId.value, capabilityId: enumCapabilityId.value, displayMode: enumDisplayMode.value } } as EnumWidget;

    case "dashboard-switch":
      return { ...base, type: "dashboard-switch", config: { targetDashboardId: dashSwitchTargetId.value } } as DashboardSwitchWidget;

    case "bar-chart": {
      const barConfig: BarChartWidget["config"] = {
        logId: barChartLogId.value,
        resolution: barChartResolution.value as BarChartWidget["config"]["resolution"],
        unit: barChartUnit.value || undefined,
        multiplier: barChartMultiplier.value !== 1 ? barChartMultiplier.value : undefined,
        color: barChartColor.value !== "#4fc3f7" ? barChartColor.value : undefined,
        hideXAxis: barChartHideXAxis.value || undefined,
        decimals: barChartDecimals.value,
      };
      if (barChartSecondaryLogId.value && barChartSecondaryLogId.value !== "__pending__") {
        barConfig.secondary = {
          logId: barChartSecondaryLogId.value,
          unit: barChartSecondaryUnit.value || undefined,
          multiplier: barChartSecondaryMultiplier.value !== 1 ? barChartSecondaryMultiplier.value : undefined,
          color: barChartSecondaryColor.value !== "#ffb74d" ? barChartSecondaryColor.value : undefined,
        };
      }
      return { ...base, type: "bar-chart", config: barConfig } as BarChartWidget;
    }

    case "pie-chart":
      return {
        ...base,
        type: "pie-chart",
        config: {
          slices: pieSlices.value,
          style: pieStyle.value,
          unit: pieUnit.value || undefined,
          multiplier: pieMultiplier.value !== 1 ? pieMultiplier.value : undefined,
          decimals: pieDecimals.value,
          resolution: pieResolution.value || undefined,
          aggregation: pieAggregation.value || undefined,
        },
      } as PieChartWidget;

    case "multi-line-chart":
      return {
        ...base,
        type: "multi-line-chart",
        config: {
          series: multiLineSeries.value,
          resolution: multiLineResolution.value as MultiLineChartWidget["config"]["resolution"],
          hideXAxis: multiLineHideXAxis.value || undefined,
          decimals: multiLineDecimals.value,
        },
      } as MultiLineChartWidget;

    case "image-switch":
      return { ...base, type: "image-switch", config: {
        deviceId: imgSwitchDeviceId.value,
        capabilityId: imgSwitchCapabilityId.value,
        onImage: imgSwitchOnImage.value,
        offImage: imgSwitchOffImage.value,
        chromeless: imgSwitchChromeless.value || undefined,
      }} as ImageSwitchWidget;

    case "camera":
      return { ...base, type: "camera", config: { rtspUrl: cameraRtspUrl.value } } as CameraWidget;

    case "battery":
      return { ...base, type: "battery", config: {
        deviceId: batteryDeviceId.value,
        capabilityId: batteryCapabilityId.value,
        orientation: batteryOrientation.value,
        style: batteryStyle.value,
        size: batterySize.value !== "medium" ? batterySize.value : undefined,
        color: batteryColor.value !== "#4fc3f7" ? batteryColor.value : undefined,
        unit: batteryUnit.value || undefined,
        multiplier: batteryMultiplier.value !== 1 ? batteryMultiplier.value : undefined,
        min: batteryMin.value,
        max: batteryMax.value,
        decimals: batteryDecimals.value,
      }} as BatteryWidget;

    default:
      return null;
  }
}

async function save() {
  const widget = buildWidget();
  if (!widget) return;

  if (props.externalMode) {
    emit("saveWidget", widget);
    emit("close");
    return;
  }

  if (props.editWidget) {
    await dashboardStore.updateWidget(widget);
  } else {
    // Enter placement mode — user taps on the grid to place the widget
    dashboardStore.setPendingWidget(widget);
  }
  emit("close");
}

async function deleteWidget() {
  if (!props.editWidget) return;

  if (props.externalMode) {
    emit("deleteWidget", props.editWidget.id);
    return;
  }

  await dashboardStore.removeWidget(props.editWidget.id);
  emit("close");
}

function openMovePopup() {
  const others = dashboardStore.dashboards.filter((d) => d.id !== dashboardStore.activeDashboardId);
  if (others.length === 0) {
    toast.show("No other dashboards to move to. Create another dashboard in settings (cog in the top bar).", "warning", 4000);
    return;
  }
  movePopupOpen.value = true;
}

async function moveToTarget(targetId: string) {
  if (!props.editWidget) return;
  await dashboardStore.moveWidgetToDashboard(props.editWidget.id, targetId);
  movePopupOpen.value = false;
  const targetName = dashboardStore.dashboards.find((d) => d.id === targetId)?.name ?? "dashboard";
  toast.show(`Widget moved to "${targetName}"`, "success");
  emit("close");
}

const isValid = () => {
  switch (selectedType.value) {
    case "switch": return switchDevices.value.length > 0;
    case "chart": return !!chartLogId.value;
    case "number": return !!numberDeviceId.value && !!numberCapabilityId.value;
    case "status": return statusDevices.value.length > 0;
    case "gauge": return !!gaugeDeviceId.value && !!gaugeCapabilityId.value;
    case "slider": return !!sliderDeviceId.value && !!sliderCapabilityId.value;
    case "knob": return !!knobDeviceId.value && !!knobCapabilityId.value;
    case "button": return buttonFlows.value.length > 0;
    case "enum": return !!enumDeviceId.value && !!enumCapabilityId.value;
    case "group-status": return groupDevices.value.length > 0;
    case "weather": return !!weatherDeviceId.value;
    case "live-chart": return !!liveChartDeviceId.value && !!liveChartCapabilityId.value;
    case "clock": return true;
    case "text": return true;
    case "container": return true;
    case "dashboard-switch": return !!dashSwitchTargetId.value;
    case "bar-chart": return !!barChartLogId.value;
    case "pie-chart": return pieSlices.value.length >= 2 && pieSlices.value.every((s) => {
      const source = (s as any).source ?? "device";
      if (source === "insights") return !!(s as any).logId;
      return !!(s as any).deviceId && !!(s as any).capabilityId;
    });
    case "multi-line-chart": return multiLineSeries.value.length >= 1 && multiLineSeries.value.every((s) => !!s.logId);
    case "image-switch": return !!imgSwitchDeviceId.value && !!imgSwitchCapabilityId.value && !!imgSwitchOnImage.value && !!imgSwitchOffImage.value;
    case "camera": return !!cameraRtspUrl.value;
    case "battery": return !!batteryDeviceId.value && !!batteryCapabilityId.value;
    default: return false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="wizard-overlay" :style="zIndex ? { zIndex } : undefined" @click.self="emit('close')">
      <div class="wizard-modal">
        <!-- Step 1: Pick type -->
        <template v-if="step === 1">
          <div class="wizard-header">
            <h2>Add Widget</h2>
            <button class="close-btn" @click="emit('close')">&times;</button>
          </div>
          <div class="tab-bar">
            <button
              v-for="cat in CATEGORIES"
              :key="cat"
              class="tab-btn"
              :class="{ active: activeTab === cat }"
              @click="activeTab = cat"
            >
              <span class="tab-icon" v-html="CATEGORY_ICONS[cat]" />
              {{ CATEGORY_LABELS[cat] }}
              <span class="tab-count">{{ filteredTypes.filter(w => w.category === cat).length }}</span>
            </button>
          </div>
          <div class="wizard-body">
            <div class="type-grid">
              <button
                v-for="wt in filteredTypes.filter(w => w.category === activeTab)"
                :key="wt.type"
                class="type-card"
                @click="pickType(wt.type)"
              >
                <div class="type-preview" v-html="WIDGET_SVGS[wt.type]" />
                <div class="type-info">
                  <span class="type-name">{{ wt.name }}</span>
                  <span class="type-desc">{{ wt.description }}</span>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- Step 2: Configure -->
        <template v-if="step === 2">
          <div class="wizard-header">
            <button class="back-btn" @click="goBack">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2>{{ editWidget ? 'Edit Widget' : 'Configure Widget' }}</h2>
            <button class="close-btn" @click="emit('close')">&times;</button>
          </div>
          <!-- Config / Theme tab bar -->
          <div class="config-tab-bar">
            <button
              class="config-tab-btn"
              :class="{ active: configTab === 'config' }"
              @click="configTab = 'config'"
            >Config</button>
            <button
              class="config-tab-btn"
              :class="{ active: configTab === 'theme' }"
              @click="configTab = 'theme'"
            >Theme</button>
          </div>

          <div class="wizard-body">
            <!-- Title + hide title (config tab only) -->
            <template v-if="configTab === 'config'">
              <label class="field-label">Title</label>
              <input v-model="title" type="text" class="text-input" placeholder="Widget title..." />

              <label class="checkbox-row">
                <input v-model="hideTitle" type="checkbox" class="checkbox-input" />
                <span class="checkbox-label">Hide title</span>
              </label>
            </template>

            <!-- Theme editor -->
            <WidgetThemeEditor
              v-if="configTab === 'theme'"
              :theme="widgetTheme"
              :widget-type="selectedType"
              @update:theme="widgetTheme = $event"
              @apply-to-all="dashboardStore.applyThemeToAll($event)"
            />

            <!-- Background image (shown in theme tab) -->
            <div v-if="configTab === 'theme'" class="widget-bg-section">
              <label class="field-label">Background Image</label>
              <div v-if="widgetBgImage?.url" class="widget-bg-preview">
                <div class="widget-bg-thumb">
                  <img :src="widgetBgImage.url" alt="Widget background" />
                </div>
                <div class="widget-bg-actions">
                  <button class="btn btn-secondary btn-sm" @click="bgPickerOpen = true">Change</button>
                  <button class="btn btn-secondary btn-sm" @click="widgetBgImage = undefined">Remove</button>
                </div>
              </div>
              <button v-else class="btn btn-secondary btn-sm" @click="bgPickerOpen = true">Choose Image</button>

              <div v-if="widgetBgImage?.url" class="widget-bg-opacity">
                <label class="field-label">
                  Overlay opacity
                  <span class="field-value">{{ widgetBgImage?.overlayOpacity ?? 40 }}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="widgetBgImage?.overlayOpacity ?? 40"
                  class="setting-slider"
                  @input="widgetBgImage = { ...widgetBgImage!, overlayOpacity: parseInt(($event.target as HTMLInputElement).value) }"
                />
                <label class="field-label" style="margin-top: 8px">
                  Blur
                  <span class="field-value">{{ widgetBgImage?.blur ?? 0 }}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  :value="widgetBgImage?.blur ?? 0"
                  class="setting-slider"
                  @input="widgetBgImage = { ...widgetBgImage!, blur: parseInt(($event.target as HTMLInputElement).value) }"
                />
              </div>
            </div>

            <ImagePicker
              :open="bgPickerOpen"
              :model-value="widgetBgImage?.url"
              @update:model-value="widgetBgImage = { url: $event, overlayOpacity: widgetBgImage?.overlayOpacity ?? 40 }; bgPickerOpen = false"
              @close="bgPickerOpen = false"
            />

            <SwitchWidgetConfig
              v-if="configTab === 'config' && selectedType === 'switch'"
              :devices="switchDevices"
              :display-mode="switchDisplayMode"
              :size="switchSize"
              :label-position="switchLabelPosition"
              @update:devices="switchDevices = $event"
              @update:display-mode="switchDisplayMode = $event"
              @update:size="switchSize = $event"
              @update:label-position="switchLabelPosition = $event"
            />

            <ChartWidgetConfig
              v-if="configTab === 'config' && selectedType === 'chart'"
              :log-id="chartLogId"
              :resolution="chartResolution"
              :color="chartColor"
              :unit="chartUnit"
              :multiplier="chartMultiplier"
              :hide-x-axis="chartHideXAxis"
              :decimals="chartDecimals"
              :secondary-log-id="chartSecondaryLogId"
              :secondary-color="chartSecondaryColor"
              :secondary-unit="chartSecondaryUnit"
              :secondary-multiplier="chartSecondaryMultiplier"
              @update:log-id="chartLogId = $event"
              @update:resolution="chartResolution = $event"
              @update:color="chartColor = $event"
              @update:unit="chartUnit = $event"
              @update:multiplier="chartMultiplier = $event"
              @update:hide-x-axis="chartHideXAxis = $event"
              @update:decimals="chartDecimals = $event"
              @update:secondary-log-id="chartSecondaryLogId = $event"
              @update:secondary-color="chartSecondaryColor = $event"
              @update:secondary-unit="chartSecondaryUnit = $event"
              @update:secondary-multiplier="chartSecondaryMultiplier = $event"
            />

            <NumberWidgetConfig
              v-if="configTab === 'config' && selectedType === 'number'"
              :device-id="numberDeviceId"
              :capability-id="numberCapabilityId"
              :unit="numberUnit"
              :multiplier="numberMultiplier"
              :size="numberSize"
              :decimals="numberDecimals"
              @update:device-id="numberDeviceId = $event"
              @update:capability-id="numberCapabilityId = $event"
              @update:unit="numberUnit = $event"
              @update:multiplier="numberMultiplier = $event"
              @update:size="numberSize = $event"
              @update:decimals="numberDecimals = $event"
            />

            <StatusWidgetConfig
              v-if="configTab === 'config' && selectedType === 'status'"
              :devices="statusDevices"
              :reverse-colors="statusReverseColors"
              :display-mode="statusDisplayMode"
              @update:devices="statusDevices = $event"
              @update:reverse-colors="statusReverseColors = $event"
              @update:display-mode="statusDisplayMode = $event"
            />

            <GaugeWidgetConfig
              v-if="configTab === 'config' && selectedType === 'gauge'"
              :device-id="gaugeDeviceId"
              :capability-id="gaugeCapabilityId"
              :unit="gaugeUnit"
              :multiplier="gaugeMultiplier"
              :min="gaugeMin"
              :max="gaugeMax"
              :warning-threshold="gaugeWarning"
              :danger-threshold="gaugeDanger"
              :decimals="gaugeDecimals"
              @update:device-id="gaugeDeviceId = $event"
              @update:capability-id="gaugeCapabilityId = $event"
              @update:unit="gaugeUnit = $event"
              @update:multiplier="gaugeMultiplier = $event"
              @update:min="gaugeMin = $event"
              @update:max="gaugeMax = $event"
              @update:warning-threshold="gaugeWarning = $event"
              @update:danger-threshold="gaugeDanger = $event"
              @update:decimals="gaugeDecimals = $event"
            />

            <SliderWidgetConfig
              v-if="configTab === 'config' && selectedType === 'slider'"
              :device-id="sliderDeviceId"
              :capability-id="sliderCapabilityId"
              :unit="sliderUnit"
              :min="sliderMin"
              :max="sliderMax"
              :step="sliderStep"
              :size="sliderSize"
              :orientation="sliderOrientation"
              :hide-value="sliderHideValue"
              @update:device-id="sliderDeviceId = $event"
              @update:capability-id="sliderCapabilityId = $event"
              @update:unit="sliderUnit = $event"
              @update:min="sliderMin = $event"
              @update:max="sliderMax = $event"
              @update:step="sliderStep = $event"
              @update:size="sliderSize = $event"
              @update:orientation="sliderOrientation = $event"
              @update:hide-value="sliderHideValue = $event"
            />

            <KnobWidgetConfig
              v-if="configTab === 'config' && selectedType === 'knob'"
              :device-id="knobDeviceId"
              :capability-id="knobCapabilityId"
              :unit="knobUnit"
              :min="knobMin"
              :max="knobMax"
              :step="knobStep"
              @update:device-id="knobDeviceId = $event"
              @update:capability-id="knobCapabilityId = $event"
              @update:unit="knobUnit = $event"
              @update:min="knobMin = $event"
              @update:max="knobMax = $event"
              @update:step="knobStep = $event"
            />

            <ButtonWidgetConfig
              v-if="configTab === 'config' && selectedType === 'button'"
              :flows="buttonFlows"
              @update:flows="buttonFlows = $event"
            />

            <GroupStatusWidgetConfig
              v-if="configTab === 'config' && selectedType === 'group-status'"
              :devices="groupDevices"
              :mode="groupMode"
              :unit="groupUnit"
              :multiplier="groupMultiplier"
              @update:devices="groupDevices = $event"
              @update:mode="groupMode = $event"
              @update:unit="groupUnit = $event"
              @update:multiplier="groupMultiplier = $event"
            />

            <WeatherWidgetConfig
              v-if="configTab === 'config' && selectedType === 'weather'"
              :device-id="weatherDeviceId"
              @update:device-id="weatherDeviceId = $event"
            />

            <ClockWidgetConfig
              v-if="configTab === 'config' && selectedType === 'clock'"
              :style="clockStyle"
              :display="clockDisplay"
              :show-seconds="clockShowSeconds"
              :use24-hour="clockUse24Hour"
              @update:style="clockStyle = $event"
              @update:display="clockDisplay = $event"
              @update:show-seconds="clockShowSeconds = $event"
              @update:use24-hour="clockUse24Hour = $event"
            />

            <LiveChartWidgetConfig
              v-if="configTab === 'config' && selectedType === 'live-chart'"
              :device-id="liveChartDeviceId"
              :capability-id="liveChartCapabilityId"
              :period="liveChartPeriod"
              :update-interval="liveChartUpdateInterval"
              :color="liveChartColor"
              :negative-color="liveChartNegativeColor"
              :unit="liveChartUnit"
              :multiplier="liveChartMultiplier"
              :hide-x-axis="liveChartHideXAxis"
              :decimals="liveChartDecimals"
              :secondary-device-id="liveChartSecondaryDeviceId"
              :secondary-capability-id="liveChartSecondaryCapabilityId"
              :secondary-color="liveChartSecondaryColor"
              :secondary-negative-color="liveChartSecondaryNegativeColor"
              :secondary-unit="liveChartSecondaryUnit"
              :secondary-multiplier="liveChartSecondaryMultiplier"
              @update:device-id="liveChartDeviceId = $event"
              @update:capability-id="liveChartCapabilityId = $event"
              @update:period="liveChartPeriod = $event as LiveChartPeriod"
              @update:update-interval="liveChartUpdateInterval = $event as LiveChartUpdateInterval"
              @update:color="liveChartColor = $event"
              @update:negative-color="liveChartNegativeColor = $event"
              @update:unit="liveChartUnit = $event"
              @update:multiplier="liveChartMultiplier = $event"
              @update:hide-x-axis="liveChartHideXAxis = $event"
              @update:decimals="liveChartDecimals = $event"
              @update:secondary-device-id="liveChartSecondaryDeviceId = $event"
              @update:secondary-capability-id="liveChartSecondaryCapabilityId = $event"
              @update:secondary-color="liveChartSecondaryColor = $event"
              @update:secondary-negative-color="liveChartSecondaryNegativeColor = $event"
              @update:secondary-unit="liveChartSecondaryUnit = $event"
              @update:secondary-multiplier="liveChartSecondaryMultiplier = $event"
            />

            <ContainerWidgetConfig
              v-if="configTab === 'config' && selectedType === 'container'"
              :grid-columns="containerGridColumns"
              :grid-rows="containerGridRows"
              :child-count="containerWidgets.length"
              @update:grid-columns="containerGridColumns = $event"
              @update:grid-rows="containerGridRows = $event"
              @edit-contents="containerEditorOpen = true"
            />

            <TextWidgetConfig
              v-if="configTab === 'config' && selectedType === 'text'"
              :content="textContent"
              :html="textHtml"
              @update:content="textContent = $event"
              @update:html="textHtml = $event"
            />

            <EnumWidgetConfig
              v-if="configTab === 'config' && selectedType === 'enum'"
              :device-id="enumDeviceId"
              :capability-id="enumCapabilityId"
              :display-mode="enumDisplayMode"
              @update:device-id="enumDeviceId = $event"
              @update:capability-id="enumCapabilityId = $event"
              @update:display-mode="enumDisplayMode = $event"
            />

            <DashboardSwitchWidgetConfig
              v-if="configTab === 'config' && selectedType === 'dashboard-switch'"
              :target-dashboard-id="dashSwitchTargetId"
              @update:target-dashboard-id="dashSwitchTargetId = $event"
            />

            <BarChartWidgetConfig
              v-if="configTab === 'config' && selectedType === 'bar-chart'"
              :log-id="barChartLogId"
              :resolution="barChartResolution"
              :color="barChartColor"
              :unit="barChartUnit"
              :multiplier="barChartMultiplier"
              :hide-x-axis="barChartHideXAxis"
              :decimals="barChartDecimals"
              :secondary-log-id="barChartSecondaryLogId"
              :secondary-color="barChartSecondaryColor"
              :secondary-unit="barChartSecondaryUnit"
              :secondary-multiplier="barChartSecondaryMultiplier"
              @update:log-id="barChartLogId = $event"
              @update:resolution="barChartResolution = $event"
              @update:color="barChartColor = $event"
              @update:unit="barChartUnit = $event"
              @update:multiplier="barChartMultiplier = $event"
              @update:hide-x-axis="barChartHideXAxis = $event"
              @update:decimals="barChartDecimals = $event"
              @update:secondary-log-id="barChartSecondaryLogId = $event"
              @update:secondary-color="barChartSecondaryColor = $event"
              @update:secondary-unit="barChartSecondaryUnit = $event"
              @update:secondary-multiplier="barChartSecondaryMultiplier = $event"
            />

            <PieChartWidgetConfig
              v-if="configTab === 'config' && selectedType === 'pie-chart'"
              :slices="pieSlices"
              :style="pieStyle"
              :unit="pieUnit"
              :multiplier="pieMultiplier"
              :decimals="pieDecimals"
              :resolution="pieResolution"
              :aggregation="pieAggregation"
              @update:slices="pieSlices = $event"
              @update:style="pieStyle = $event"
              @update:unit="pieUnit = $event"
              @update:multiplier="pieMultiplier = $event"
              @update:decimals="pieDecimals = $event"
              @update:resolution="pieResolution = $event"
              @update:aggregation="pieAggregation = $event"
            />

            <MultiLineChartWidgetConfig
              v-if="configTab === 'config' && selectedType === 'multi-line-chart'"
              :series="multiLineSeries"
              :resolution="multiLineResolution"
              :hide-x-axis="multiLineHideXAxis"
              :decimals="multiLineDecimals"
              @update:series="multiLineSeries = $event"
              @update:resolution="multiLineResolution = $event"
              @update:hide-x-axis="multiLineHideXAxis = $event"
              @update:decimals="multiLineDecimals = $event"
            />

            <CameraWidgetConfig
              v-if="configTab === 'config' && selectedType === 'camera'"
              :rtsp-url="cameraRtspUrl"
              @update:rtsp-url="cameraRtspUrl = $event"
            />

            <BatteryWidgetConfig
              v-if="configTab === 'config' && selectedType === 'battery'"
              :device-id="batteryDeviceId"
              :capability-id="batteryCapabilityId"
              :orientation="batteryOrientation"
              :style="batteryStyle"
              :size="batterySize"
              :color="batteryColor"
              :unit="batteryUnit"
              :multiplier="batteryMultiplier"
              :min="batteryMin"
              :max="batteryMax"
              :decimals="batteryDecimals"
              @update:device-id="batteryDeviceId = $event"
              @update:capability-id="batteryCapabilityId = $event"
              @update:orientation="batteryOrientation = $event"
              @update:style="batteryStyle = $event"
              @update:size="batterySize = $event"
              @update:color="batteryColor = $event"
              @update:unit="batteryUnit = $event"
              @update:multiplier="batteryMultiplier = $event"
              @update:min="batteryMin = $event"
              @update:max="batteryMax = $event"
              @update:decimals="batteryDecimals = $event"
            />

            <ImageSwitchWidgetConfig
              v-if="configTab === 'config' && selectedType === 'image-switch'"
              :device-id="imgSwitchDeviceId"
              :capability-id="imgSwitchCapabilityId"
              :on-image="imgSwitchOnImage"
              :off-image="imgSwitchOffImage"
              :chromeless="imgSwitchChromeless"
              @update:device-id="imgSwitchDeviceId = $event"
              @update:capability-id="imgSwitchCapabilityId = $event"
              @update:on-image="imgSwitchOnImage = $event"
              @update:off-image="imgSwitchOffImage = $event"
              @update:chromeless="imgSwitchChromeless = $event"
            />

          </div>
          <!-- Move popup overlay -->
          <div v-if="movePopupOpen" class="move-popup-overlay" @click.self="movePopupOpen = false">
            <div class="move-popup">
              <h3>Move to Dashboard</h3>
              <div class="move-list">
                <button
                  v-for="db in dashboardStore.dashboards.filter(d => d.id !== dashboardStore.activeDashboardId)"
                  :key="db.id"
                  class="move-item"
                  @click="moveToTarget(db.id)"
                >
                  {{ db.name }}
                </button>
              </div>
              <button class="btn btn-secondary move-cancel" @click="movePopupOpen = false">Cancel</button>
            </div>
          </div>

          <div class="wizard-footer">
            <button
              v-if="editWidget"
              class="btn btn-danger"
              @click="deleteWidget"
            >
              Delete
            </button>
            <button
              v-if="editWidget && !externalMode"
              class="btn btn-secondary"
              @click="openMovePopup"
            >
              Move
            </button>
            <div class="spacer" />
            <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
            <button class="btn btn-primary" :disabled="!isValid()" @click="save">
              {{ editWidget ? 'Save' : 'Add' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Container editor (full-screen, above wizard) -->
    <ContainerEditor
      v-if="containerEditorOpen"
      :grid-columns="containerGridColumns"
      :grid-rows="containerGridRows"
      :widgets="containerWidgets"
      @save="containerWidgets = $event; containerEditorOpen = false"
      @cancel="containerEditorOpen = false"
    />
  </Teleport>
</template>

<style scoped>
.wizard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.wizard-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 90%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.wizard-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.wizard-header h2 {
  flex: 1;
  font-size: 1.1rem;
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
}

.close-btn:hover {
  color: var(--text-primary);
}

.back-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.back-btn:hover {
  color: var(--text-primary);
}

.wizard-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
}

.tab-btn {
  flex: 1;
  padding: 10px 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-icon {
  display: flex;
  align-items: center;
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.tab-count {
  font-size: 0.7rem;
  font-weight: 500;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1px 6px;
  opacity: 0.6;
}

.tab-btn.active .tab-count {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  opacity: 1;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  color: var(--text-primary);
}

.type-card:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, var(--bg-card));
}

.type-preview {
  width: 64px;
  height: 40px;
  color: var(--accent);
  flex-shrink: 0;
}

.type-preview :deep(svg) {
  width: 100%;
  height: 100%;
}

.type-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.type-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.text-input {
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

.text-input:focus {
  border-color: var(--accent);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.checkbox-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.wizard-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.spacer {
  flex: 1;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent);
  color: #000;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.config-tab-bar {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin: 12px 20px 0;
}

.config-tab-btn {
  flex: 1;
  padding: 7px 0;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.config-tab-btn:not(:last-child) {
  border-right: 1px solid var(--border);
}

.config-tab-btn.active {
  background: var(--bg-card);
  color: var(--accent);
}

.config-tab-btn:hover:not(.active) {
  color: var(--text-primary);
}

/* Move popup */
.move-popup-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: var(--radius);
}

.move-popup {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  width: 90%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.move-popup h3 {
  font-size: 1rem;
  font-weight: 600;
}

.move-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.move-item {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
}

.move-item:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-card));
}

.move-cancel {
  align-self: flex-end;
}

/* Widget background image */
.widget-bg-section {
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.widget-bg-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.widget-bg-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.widget-bg-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.widget-bg-actions {
  display: flex;
  gap: 6px;
}

.widget-bg-opacity {
  margin-top: 8px;
}

.field-value {
  float: right;
  font-weight: 700;
  color: var(--accent);
}

.btn-sm {
  padding: 4px 12px;
  font-size: 0.8rem;
  min-height: 32px;
}

.setting-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  outline: none;
  cursor: pointer;
  min-height: 48px;
  margin: 0;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}
</style>
