import * as icons from "lucide-vue-next";
import type { Component } from "vue";

const iconMap = icons as unknown as Record<string, Component>;

export function resolveIcon(name: string): Component | null {
  return iconMap[name] ?? null;
}
