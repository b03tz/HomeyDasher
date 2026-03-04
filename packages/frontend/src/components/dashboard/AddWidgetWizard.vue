<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type {
  DashboardWidget, SwitchWidget, ChartWidget, NumberWidget,
  StatusWidget, GaugeWidget, SliderWidget, KnobWidget, ButtonWidget,
  GroupStatusWidget, WeatherWidget, ClockWidget, ContainerWidget,
  LiveChartWidget, LiveChartPeriod, LiveChartUpdateInterval,
  WidgetDeviceRef, NumberWidgetSize, GroupStatusMode, ClockStyle, ClockDisplay,
} from "@homecontrol/shared";
import { useDashboardStore } from "../../stores/dashboard";
import { nextAvailableRow } from "../../utils/gridUtils";
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
import ContainerEditor from "./ContainerEditor.vue";

type WidgetCategory = "display" | "control" | "utility";

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
  { type: "chart", name: "Line Chart", description: "Historical data graph over time", category: "display" },
  { type: "live-chart", name: "Live Chart", description: "Real-time line chart from capability updates", category: "display" },
  { type: "group-status", name: "Group Status", description: "Aggregate count, all-off check, or sum", category: "display" },
  { type: "weather", name: "Weather", description: "Multi-value weather from a device", category: "display" },
  // Control (settable)
  { type: "switch", name: "Switch", description: "Toggle on/off devices", category: "control" },
  { type: "slider", name: "Slider", description: "Dimmers, temperature, etc.", category: "control" },
  { type: "knob", name: "Knob", description: "Rotary dial for touchscreen control", category: "control" },
  { type: "button", name: "Button", description: "Trigger a Homey flow with a tap", category: "control" },
  // Utility
  { type: "clock", name: "Clock", description: "Analog or digital clock with date", category: "utility" },
  { type: "container", name: "Container", description: "Group widgets in a nested mini-grid", category: "utility" },
];

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  display: "Display",
  control: "Control",
  utility: "Utility",
};

const CATEGORY_ICONS: Record<WidgetCategory, string> = {
  display: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>`,
  control: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  utility: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>`,
};

const CATEGORIES: WidgetCategory[] = ["display", "control", "utility"];

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

const step = ref(1);
const selectedType = ref<string>("");
const title = ref("");
const hideTitle = ref(false);

// Switch state
const switchDevices = ref<WidgetDeviceRef[]>([]);

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

// Knob state
const knobDeviceId = ref("");
const knobCapabilityId = ref("");
const knobUnit = ref("");
const knobMin = ref<number | undefined>(undefined);
const knobMax = ref<number | undefined>(undefined);
const knobStep = ref<number | undefined>(undefined);

// Button state
const buttonFlowId = ref("");
const buttonColor = ref("");

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

function resetAll() {
  hideTitle.value = false;
  switchDevices.value = [];
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
  knobDeviceId.value = "";
  knobCapabilityId.value = "";
  knobUnit.value = "";
  knobMin.value = undefined;
  knobMax.value = undefined;
  knobStep.value = undefined;
  buttonFlowId.value = "";
  buttonColor.value = "";
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
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return;

  if (props.editWidget) {
    step.value = 2;
    selectedType.value = props.editWidget.type;
    title.value = props.editWidget.title;
    hideTitle.value = !!props.editWidget.hideTitle;

    if (props.editWidget.type === "switch") {
      switchDevices.value = [...props.editWidget.config.devices];
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
    } else if (props.editWidget.type === "knob") {
      knobDeviceId.value = props.editWidget.config.deviceId;
      knobCapabilityId.value = props.editWidget.config.capabilityId;
      knobUnit.value = props.editWidget.config.unit ?? "";
      knobMin.value = props.editWidget.config.min;
      knobMax.value = props.editWidget.config.max;
      knobStep.value = props.editWidget.config.step;
    } else if (props.editWidget.type === "button") {
      buttonFlowId.value = props.editWidget.config.flowId;
      buttonColor.value = props.editWidget.config.color ?? "";
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
  const base = {
    id: props.editWidget?.id ?? crypto.randomUUID(),
    title: title.value.trim(),
    hideTitle: hideTitle.value || undefined,
    position: props.editWidget?.position ?? { col: 1, row: defaultRow },
  };

  switch (selectedType.value) {
    case "switch":
      return { ...base, type: "switch", config: { devices: switchDevices.value } } as SwitchWidget;

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
      return { ...base, type: "status", config: { devices: statusDevices.value, reverseColors: statusReverseColors.value || undefined } } as StatusWidget;

    case "gauge": {
      const thresholds = (gaugeWarning.value != null || gaugeDanger.value != null)
        ? { warning: gaugeWarning.value, danger: gaugeDanger.value }
        : undefined;
      return { ...base, type: "gauge", config: { deviceId: gaugeDeviceId.value, capabilityId: gaugeCapabilityId.value, unit: gaugeUnit.value || undefined, multiplier: gaugeMultiplier.value !== 1 ? gaugeMultiplier.value : undefined, min: gaugeMin.value, max: gaugeMax.value, thresholds, decimals: gaugeDecimals.value } } as GaugeWidget;
    }

    case "slider":
      return { ...base, type: "slider", config: { deviceId: sliderDeviceId.value, capabilityId: sliderCapabilityId.value, unit: sliderUnit.value || undefined, min: sliderMin.value, max: sliderMax.value, step: sliderStep.value } } as SliderWidget;

    case "knob":
      return { ...base, type: "knob", config: { deviceId: knobDeviceId.value, capabilityId: knobCapabilityId.value, unit: knobUnit.value || undefined, min: knobMin.value, max: knobMax.value, step: knobStep.value } } as KnobWidget;

    case "button":
      return { ...base, type: "button", config: { flowId: buttonFlowId.value, color: buttonColor.value || undefined } } as ButtonWidget;

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

const isValid = () => {
  if (!title.value.trim()) return false;
  switch (selectedType.value) {
    case "switch": return switchDevices.value.length > 0;
    case "chart": return !!chartLogId.value;
    case "number": return !!numberDeviceId.value && !!numberCapabilityId.value;
    case "status": return statusDevices.value.length > 0;
    case "gauge": return !!gaugeDeviceId.value && !!gaugeCapabilityId.value;
    case "slider": return !!sliderDeviceId.value && !!sliderCapabilityId.value;
    case "knob": return !!knobDeviceId.value && !!knobCapabilityId.value;
    case "button": return !!buttonFlowId.value;
    case "group-status": return groupDevices.value.length > 0;
    case "weather": return !!weatherDeviceId.value;
    case "live-chart": return !!liveChartDeviceId.value && !!liveChartCapabilityId.value;
    case "clock": return true;
    case "container": return true;
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
          <div class="wizard-body">
            <label class="field-label">Title</label>
            <input v-model="title" type="text" class="text-input" placeholder="Widget title..." />

            <label class="checkbox-row">
              <input v-model="hideTitle" type="checkbox" class="checkbox-input" />
              <span class="checkbox-label">Hide title</span>
            </label>

            <SwitchWidgetConfig
              v-if="selectedType === 'switch'"
              :devices="switchDevices"
              @update:devices="switchDevices = $event"
            />

            <ChartWidgetConfig
              v-if="selectedType === 'chart'"
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
              v-if="selectedType === 'number'"
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
              v-if="selectedType === 'status'"
              :devices="statusDevices"
              :reverse-colors="statusReverseColors"
              @update:devices="statusDevices = $event"
              @update:reverse-colors="statusReverseColors = $event"
            />

            <GaugeWidgetConfig
              v-if="selectedType === 'gauge'"
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
              v-if="selectedType === 'slider'"
              :device-id="sliderDeviceId"
              :capability-id="sliderCapabilityId"
              :unit="sliderUnit"
              :min="sliderMin"
              :max="sliderMax"
              :step="sliderStep"
              @update:device-id="sliderDeviceId = $event"
              @update:capability-id="sliderCapabilityId = $event"
              @update:unit="sliderUnit = $event"
              @update:min="sliderMin = $event"
              @update:max="sliderMax = $event"
              @update:step="sliderStep = $event"
            />

            <KnobWidgetConfig
              v-if="selectedType === 'knob'"
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
              v-if="selectedType === 'button'"
              :flow-id="buttonFlowId"
              :color="buttonColor"
              @update:flow-id="buttonFlowId = $event"
              @update:color="buttonColor = $event"
            />

            <GroupStatusWidgetConfig
              v-if="selectedType === 'group-status'"
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
              v-if="selectedType === 'weather'"
              :device-id="weatherDeviceId"
              @update:device-id="weatherDeviceId = $event"
            />

            <ClockWidgetConfig
              v-if="selectedType === 'clock'"
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
              v-if="selectedType === 'live-chart'"
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
              v-if="selectedType === 'container'"
              :grid-columns="containerGridColumns"
              :grid-rows="containerGridRows"
              :child-count="containerWidgets.length"
              @update:grid-columns="containerGridColumns = $event"
              @update:grid-rows="containerGridRows = $event"
              @edit-contents="containerEditorOpen = true"
            />
          </div>
          <div class="wizard-footer">
            <button
              v-if="editWidget"
              class="btn btn-danger"
              @click="deleteWidget"
            >
              Delete
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
  max-width: 480px;
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
  grid-template-columns: 1fr 1fr;
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
</style>
