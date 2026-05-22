import type { LayoutItem } from "../types";
import { BaseWidget } from "./base/BaseWidget";
import type { AppearanceGroup } from "./base/types";
import { BarWidget } from "./bar/BarWidget";
import { GaugeWidget } from "./gauge/GaugeWidget";
import { TextWidget } from "./text/TextWidget";

export const TIME_SOURCE = "time";
export const CHANNEL_WIDGET_TYPES = ["gauge", "bar", "text"] as const;
export const TIME_WIDGET_TYPES = ["text"] as const;

export const widgetRegistry: Record<string, BaseWidget> = {
  bar: new BarWidget(),
  gauge: new GaugeWidget(),
  text: new TextWidget(),
};

export function getWidgetDefinition(widget: string) {
  return widgetRegistry[widget] ?? widgetRegistry.text;
}

export function widgetBaseSize(widget: string): [number, number] {
  return getWidgetDefinition(widget).baseSize;
}

export function widgetTypesForSourceName(source: string): string[] {
  return source === TIME_SOURCE ? [...TIME_WIDGET_TYPES] : [...CHANNEL_WIDGET_TYPES];
}

export function defaultAppearanceForWidget(widget: string): Partial<LayoutItem> {
  return getWidgetDefinition(widget).defaultAppearance();
}

export function sanitizeWidgetAppearance(
  widget: string,
  userItem: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Partial<LayoutItem> {
  return getWidgetDefinition(widget).sanitizeAppearance(userItem, defaults);
}

export function appearanceGroupsForWidget(widget: string): AppearanceGroup[] {
  return getWidgetDefinition(widget).appearanceGroups();
}
