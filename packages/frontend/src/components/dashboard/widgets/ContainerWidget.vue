<script setup lang="ts">
import { computed } from "vue";
import type { ContainerWidget as ContainerWidgetType, WidgetTheme } from "@homecontrol/shared";
import { getEffectiveColSpan, getEffectiveRowSpan } from "../../../utils/widgetSize";
import WidgetHeader from "../WidgetHeader.vue";
import SwitchWidget from "./SwitchWidget.vue";
import ChartWidget from "./ChartWidget.vue";
import NumberWidget from "./NumberWidget.vue";
import StatusWidget from "./StatusWidget.vue";
import GaugeWidget from "./GaugeWidget.vue";
import SliderWidget from "./SliderWidget.vue";
import KnobWidget from "./KnobWidget.vue";
import ButtonWidget from "./ButtonWidget.vue";
import GroupStatusWidget from "./GroupStatusWidget.vue";
import WeatherWidget from "./WeatherWidget.vue";
import ClockWidget from "./ClockWidget.vue";
import LiveChartWidget from "./LiveChartWidget.vue";
import EnumWidget from "./EnumWidget.vue";
import TextWidget from "./TextWidget.vue";
import DashboardSwitchWidget from "./DashboardSwitchWidget.vue";

const props = defineProps<{
  widget: ContainerWidgetType;
}>();

const miniGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.widget.config.gridColumns}, 1fr)`,
  gridTemplateRows: `repeat(${props.widget.config.gridRows}, 1fr)`,
}));

function themeStyle(theme?: WidgetTheme): Record<string, string> {
  if (!theme) return {};
  const m: Record<string, string> = {};
  if (theme.background) m["--bg-card"] = theme.background;
  if (theme.foreground) m["--text-primary"] = theme.foreground;
  if (theme.secondaryText) m["--text-secondary"] = theme.secondaryText;
  if (theme.borderColor) m["--border"] = theme.borderColor;
  if (theme.accentColor) m["--accent"] = theme.accentColor;
  if (theme.subBackground) m["--bg-secondary"] = theme.subBackground;
  if (theme.sliderFillColor) m["--widget-slider-fill"] = theme.sliderFillColor;
  return m;
}

function childGridStyle(child: ContainerWidgetType["config"]["widgets"][number]) {
  const colSpan = getEffectiveColSpan(child);
  const rowSpan = getEffectiveRowSpan(child);
  return {
    gridColumn: `${child.position.col} / span ${colSpan}`,
    gridRow: `${child.position.row} / span ${rowSpan}`,
    ...themeStyle(child.theme),
  };
}
</script>

<template>
  <div class="container-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="container-grid" :style="miniGridStyle">
      <div
        v-for="child in widget.config.widgets"
        :key="child.id"
        :style="childGridStyle(child)"
        class="container-child"
      >
        <SwitchWidget v-if="child.type === 'switch'" :widget="child" />
        <ChartWidget v-else-if="child.type === 'chart'" :widget="child" />
        <NumberWidget v-else-if="child.type === 'number'" :widget="child" />
        <StatusWidget v-else-if="child.type === 'status'" :widget="child" />
        <GaugeWidget v-else-if="child.type === 'gauge'" :widget="child" />
        <SliderWidget v-else-if="child.type === 'slider'" :widget="child" />
        <KnobWidget v-else-if="child.type === 'knob'" :widget="child" />
        <ButtonWidget v-else-if="child.type === 'button'" :widget="child" />
        <GroupStatusWidget v-else-if="child.type === 'group-status'" :widget="child" />
        <WeatherWidget v-else-if="child.type === 'weather'" :widget="child" />
        <ClockWidget v-else-if="child.type === 'clock'" :widget="child" />
        <LiveChartWidget v-else-if="child.type === 'live-chart'" :widget="child" />
        <EnumWidget v-else-if="child.type === 'enum'" :widget="child" />
        <TextWidget v-else-if="child.type === 'text'" :widget="child" />
        <DashboardSwitchWidget v-else-if="child.type === 'dashboard-switch'" :widget="child" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.container-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--grid-gap);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.container-grid {
  flex: 1;
  display: grid;
  gap: var(--grid-gap);
  min-height: 0;
}

.container-child {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
