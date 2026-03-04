export interface WidgetPosition {
  col: number; // 1-based, 1–12
  row: number; // 1-based
  colSpan?: number; // explicit column span override (1–12)
  rowSpan?: number; // explicit row span override
}

export interface WidgetDeviceRef {
  deviceId: string;
  capabilityId: string;
  sliderCapabilityId?: string;
}

export interface BaseWidget {
  id: string;
  type: string;
  title: string;
  hideTitle?: boolean;
  position: WidgetPosition;
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

export interface StatusWidget extends BaseWidget {
  type: "status";
  config: {
    devices: { deviceId: string; capabilityId: string }[];
    reverseColors?: boolean;
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

export interface ButtonWidget extends BaseWidget {
  type: "button";
  config: {
    flowId: string;
    color?: string;
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

export interface ContainerWidget extends BaseWidget {
  type: "container";
  config: {
    gridColumns: number;  // 2–6
    gridRows: number;     // 1–6
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
  | ContainerWidget;

export interface DashboardConfig {
  widgets: DashboardWidget[];
}

export interface GridConfig {
  columns: number;      // 3–12
  rows: number;         // 3–12
  gap?: number;         // grid gap in px, 0–25 (default 12)
  borderRadius?: number; // widget border-radius in px, 0–12 (default 12)
}

export interface DashboardEntry {
  id: string;
  name: string;
}

export interface AppConfig {
  grid: GridConfig;
  dashboards: DashboardEntry[];
  activeDashboardId: string;
}
