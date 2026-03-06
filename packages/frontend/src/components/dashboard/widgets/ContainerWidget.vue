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
import BarChartWidget from "./BarChartWidget.vue";
import PieChartWidget from "./PieChartWidget.vue";
import MultiLineChartWidget from "./MultiLineChartWidget.vue";
import CameraWidget from "./CameraWidget.vue";

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
  const style: Record<string, string> = {
    gridColumn: `${child.position.col} / span ${colSpan}`,
    gridRow: `${child.position.row} / span ${rowSpan}`,
    ...themeStyle(child.theme),
  };
  if (child.backgroundImage?.url) {
    style["--widget-bg-image"] = `url(${child.backgroundImage.url})`;
    style["--widget-bg-overlay"] = `rgba(0, 0, 0, ${(child.backgroundImage.overlayOpacity ?? 40) / 100})`;
    style["--widget-bg-blur"] = `${child.backgroundImage.blur ?? 0}px`;
  }
  return style;
}

function hasChildBg(child: ContainerWidgetType["config"]["widgets"][number]): boolean {
  return !!child.backgroundImage?.url;
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
        :class="{ 'has-bg-image': hasChildBg(child) }"
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
        <BarChartWidget v-else-if="child.type === 'bar-chart'" :widget="child" />
        <PieChartWidget v-else-if="child.type === 'pie-chart'" :widget="child" />
        <MultiLineChartWidget v-else-if="child.type === 'multi-line-chart'" :widget="child" />
        <CameraWidget v-else-if="child.type === 'camera'" :widget="child" />
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
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.container-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
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
  position: relative;
}

.container-child.has-bg-image {
  border-radius: var(--radius);
}

.container-child.has-bg-image::before,
.container-child.has-bg-image::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: var(--radius);
}

.container-child.has-bg-image::before {
  background-image: var(--widget-bg-image);
  background-size: cover;
  background-position: center;
  filter: blur(var(--widget-bg-blur, 0px));
  z-index: 0;
}

.container-child.has-bg-image::after {
  background: var(--widget-bg-overlay);
  z-index: 0;
}

.container-child.has-bg-image > * {
  position: relative;
  z-index: 1;
}
</style>
