import type { AppMetadata, CsvSample, FrameState, LayoutItem } from "./types";

export function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return Math.max(low, Math.min(high, value));
}

export function numeric(value: number | string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const BAR_APPEARANCE_DEFAULTS = {
  trackFillThickness: 68,
  trackOutlineThickness: 3,
  centerMarkThickness: 2,
  cornerRadius: 100,
};

export const GRAPH_APPEARANCE_DEFAULTS = {
  beforeMs: 3000,
  afterMs: 1000,
  lineThickness: 3,
};

export function widgetSize(widget: string): [number, number] {
  const sizes: Record<string, [number, number]> = {
    text:  [280, 52],
    bar:   [220, 48],
    gauge: [250, 250],
    graph: [320, 140],
  };
  return sizes[widget] ?? [180, 60];
}

export function widgetTypesForSource(metadata: AppMetadata, source: string): string[] {
  return source === "time" ? metadata.time_widget_types : metadata.channel_widget_types;
}

export function itemBounds(
  item: LayoutItem,
  frameWidth: number,
  frameHeight: number,
): [number, number, number, number] {
  const [baseWidth, baseHeight] = widgetSize(item.widget);
  const scale = Math.max(0.2, Math.min(frameWidth / 1920, frameHeight / 1080));
  const width = Math.max(32, baseWidth * scale * Number(item.scale_x || 1));
  const height = Math.max(24, baseHeight * scale * Number(item.scale_y || 1));
  const centerX = item.x * frameWidth;
  const centerY = item.y * frameHeight;
  const left = clamp(centerX - width / 2, 0, Math.max(0, frameWidth - width));
  const top = clamp(centerY - height / 2, 0, Math.max(0, frameHeight - height));
  return [left, top, left + width, top + height];
}

export function interpolateState(samples: CsvSample[], timeMs: number): FrameState {
  if (!samples.length) return {};
  if (timeMs <= samples[0].time_ms) return { ...samples[0].values };
  const last = samples[samples.length - 1];
  if (timeMs >= last.time_ms) return { ...last.values };
  let index = 0;
  while (index < samples.length - 2 && samples[index + 1].time_ms < timeMs) index += 1;
  const left = samples[index];
  const right = samples[index + 1];
  const segment = right.time_ms - left.time_ms;
  const t = segment <= 0 ? 0 : (timeMs - left.time_ms) / segment;
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const state: FrameState = {};
  const sources = new Set([...Object.keys(left.values), ...Object.keys(right.values)]);
  for (const source of sources) {
    state[source] = lerp(left.values[source] ?? 0, right.values[source] ?? 0);
  }
  return state;
}
