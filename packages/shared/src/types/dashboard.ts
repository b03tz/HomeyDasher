export interface BackgroundImage {
  url: string;
  overlayOpacity?: number; // 0–100, default 40
  blur?: number; // 0–20 px, default 0
}

export type LayoutMode = "grid" | "freeform";

export interface WidgetPosition {
  col: number; // 1-based, 1–12
  row: number; // 1-based
  colSpan?: number; // explicit column span override (1–12)
  rowSpan?: number; // explicit row span override
  // Freeform positioning (pixels)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface WidgetDeviceRef {
  deviceId: string;
  capabilityId: string;
  sliderCapabilityId?: string;
}

export interface WidgetTheme {
  background?: string;       // overrides --bg-card
  foreground?: string;       // overrides --text-primary
  secondaryText?: string;    // overrides --text-secondary (units, labels)
  borderColor?: string;      // overrides --border
  accentColor?: string;      // overrides --accent (slider knob, knob arc, gauge arc, etc.)
  subBackground?: string;    // overrides --bg-secondary (switch buttons, status dots, container children)
  sliderFillColor?: string;  // slider filled track left of thumb
}

export interface BaseWidget {
  id: string;
  type: string;
  title: string;
  hideTitle?: boolean;
  position: WidgetPosition;
  theme?: WidgetTheme;
  backgroundImage?: BackgroundImage;
}

export interface SwitchWidget extends BaseWidget {
  type: "switch";
  config: {
    devices: WidgetDeviceRef[];
  };
}

export interface ChartWidget extends BaseWidget {
  type: "chart";
  config: {
    /** Full Homey insight log ID, e.g. "homey:device:XXX:energy_power" */
    logId: string;
    resolution: "lastHour" | "last6Hours" | "last24Hours" | "last7Days" | "last14Days" | "last31Days";
    unit?: string;
    multiplier?: number;
    color?: string;
    hideXAxis?: boolean;
    decimals?: number;
    secondary?: {
      logId: string;
      unit?: string;
      multiplier?: number;
      color?: string;
    };
  };
}

export type NumberWidgetSize = "small" | "medium" | "large";

export interface NumberWidget extends BaseWidget {
  type: "number";
  config: {
    deviceId: string;
    capabilityId: string;
    unit: string;
    multiplier: number;
    size: NumberWidgetSize;
    decimals?: number;
  };
}

export type StatusDisplayMode = "columns" | "led-list";

export interface StatusWidget extends BaseWidget {
  type: "status";
  config: {
    devices: { deviceId: string; capabilityId: string }[];
    reverseColors?: boolean;
    displayMode?: StatusDisplayMode;
  };
}

export interface GaugeWidget extends BaseWidget {
  type: "gauge";
  config: {
    deviceId: string;
    capabilityId: string;
    unit?: string;
    multiplier?: number;
    min?: number;
    max?: number;
    thresholds?: { warning?: number; danger?: number };
    decimals?: number;
  };
}

export interface SliderWidget extends BaseWidget {
  type: "slider";
  config: {
    deviceId: string;
    capabilityId: string;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
  };
}

export interface KnobWidget extends BaseWidget {
  type: "knob";
  config: {
    deviceId: string;
    capabilityId: string;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
  };
}

export interface ButtonFlowRef {
  flowId: string;
  label?: string;
  color?: string;
}

export interface ButtonWidget extends BaseWidget {
  type: "button";
  config: {
    flows: ButtonFlowRef[];
  };
}

export type GroupStatusMode = "count" | "allOff" | "sum";

export interface GroupStatusWidget extends BaseWidget {
  type: "group-status";
  config: {
    devices: { deviceId: string; capabilityId: string }[];
    mode: GroupStatusMode;
    unit?: string;
    multiplier?: number;
  };
}

export interface WeatherWidget extends BaseWidget {
  type: "weather";
  config: { deviceId: string };
}

export type ClockStyle = "analog" | "digital";
export type ClockDisplay = "time" | "date" | "both";

export interface ClockWidget extends BaseWidget {
  type: "clock";
  config: {
    style: ClockStyle;
    display: ClockDisplay;
    showSeconds?: boolean;
    use24Hour?: boolean;
  };
}

export type LiveChartPeriod = "last1Min" | "last5Min" | "last30Min" | "lastHour";
export type LiveChartUpdateInterval = "live" | "2s" | "5s" | "10s" | "30s" | "1min";

export interface LiveChartWidget extends BaseWidget {
  type: "live-chart";
  config: {
    deviceId: string;
    capabilityId: string;
    period: LiveChartPeriod;
    updateInterval?: LiveChartUpdateInterval;
    unit?: string;
    multiplier?: number;
    color?: string;
    negativeColor?: string;
    hideXAxis?: boolean;
    decimals?: number;
    secondary?: {
      deviceId: string;
      capabilityId: string;
      unit?: string;
      multiplier?: number;
      color?: string;
      negativeColor?: string;
    };
  };
}

export interface EnumWidget extends BaseWidget {
  type: "enum";
  config: {
    deviceId: string;
    capabilityId: string;
    displayMode: "popup" | "scroll";
  };
}

export interface ContainerWidget extends BaseWidget {
  type: "container";
  config: {
    gridColumns: number;  // 2–8
    gridRows: number;     // 1–8
    widgets: DashboardWidget[];
  };
}

export type DashboardWidget =
  | SwitchWidget
  | ChartWidget
  | NumberWidget
  | StatusWidget
  | GaugeWidget
  | SliderWidget
  | KnobWidget
  | ButtonWidget
  | GroupStatusWidget
  | WeatherWidget
  | ClockWidget
  | LiveChartWidget
  | EnumWidget
  | ContainerWidget
  | DashboardSwitchWidget
  | TextWidget
  | BarChartWidget
  | PieChartWidget
  | MultiLineChartWidget;

export interface DashboardConfig {
  widgets: DashboardWidget[];
  grid?: GridConfig;
  layoutMode?: LayoutMode;
  backgroundImage?: BackgroundImage;
  widgetBlur?: number; // 0–20 px, card backdrop blur, default 18
}

export interface GridConfig {
  columns: number;      // 3–12
  rows: number;         // 3–12
  gap?: number;         // grid gap in px, 0–25 (default 12)
  borderRadius?: number; // widget border-radius in px, 0–12 (default 12)
  showBorders?: boolean; // show card borders (default true)
}

export interface TextWidget extends BaseWidget {
  type: "text";
  config: {
    content?: string;
    html?: boolean;
  };
}

export interface DashboardSwitchWidget extends BaseWidget {
  type: "dashboard-switch";
  config: {
    targetDashboardId: string;
  };
}

export interface BarChartWidget extends BaseWidget {
  type: "bar-chart";
  config: {
    logId: string;
    resolution: "lastHour" | "last6Hours" | "last24Hours" | "last7Days" | "last14Days" | "last31Days";
    unit?: string;
    multiplier?: number;
    color?: string;
    hideXAxis?: boolean;
    decimals?: number;
    secondary?: {
      logId: string;
      unit?: string;
      multiplier?: number;
      color?: string;
    };
  };
}

export type PieChartStyle = "pie" | "doughnut";
export type PieChartAggregation = "sum" | "average";

export interface PieChartDeviceSlice {
  source: "device";
  deviceId: string;
  capabilityId: string;
  label?: string;
  color?: string;
}

export interface PieChartInsightsSlice {
  source: "insights";
  logId: string;
  label?: string;
  color?: string;
}

export type PieChartSlice = PieChartDeviceSlice | PieChartInsightsSlice;

export interface PieChartWidget extends BaseWidget {
  type: "pie-chart";
  config: {
    slices: PieChartSlice[];
    style: PieChartStyle;
    unit?: string;
    multiplier?: number;
    decimals?: number;
    resolution?: "lastHour" | "last6Hours" | "last24Hours" | "last7Days" | "last14Days" | "last31Days";
    aggregation?: PieChartAggregation;
  };
}

export interface MultiLineChartSeries {
  logId: string;
  color?: string;
  unit?: string;
  multiplier?: number;
}
export interface MultiLineChartWidget extends BaseWidget {
  type: "multi-line-chart";
  config: {
    series: MultiLineChartSeries[];
    resolution: "lastHour" | "last6Hours" | "last24Hours" | "last7Days" | "last14Days" | "last31Days";
    hideXAxis?: boolean;
    decimals?: number;
  };
}

export interface DashboardEntry {
  id: string;
  name: string;
  icon?: string;
}

export interface AppConfig {
  grid: GridConfig;
  dashboards: DashboardEntry[];
  activeDashboardId: string;
  deviceOverrides?: Record<string, string>;
}
