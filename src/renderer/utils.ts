import type {
  AppMetadata,
  AppSettings,
  CsvSample,
  FrameState,
  LayoutItem,
  OverlayApi,
} from "../shared/types";
import {
  CHANNEL_WIDGET_TYPES,
  TIME_WIDGET_TYPES,
  defaultAppearanceForWidget,
  widgetBaseSize,
} from "../shared/widgets/registry";

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type ResizePreview = { itemId: string; x: number; y: number; scaleX: number; scaleY: number };

export type ResizingState = {
  itemId: string;
  handle: HandleId;
  fixedLocalX: number | null;
  fixedLocalY: number | null;
  origCenterX: number; origCenterY: number;
  origWidth: number; origHeight: number;
  origScaleX: number; origScaleY: number;
  rotation: number;
};

export const defaultSettings: AppSettings = {
  csv_path: "",
  output_dir: "",
  video_output: "output/overlay.mov",
  ffmpeg_path: "",
  fps: 30,
  width: 1920,
  height: 1080,
  offset_ms: 0,
  duration_ms: "",
  render_video: false,
  layout: {},
};

export const fallbackMetadata: AppMetadata = {
  sources: ["time", "ch1", "ch2", "ch3", "ch4"],
  channel_widget_types: [...CHANNEL_WIDGET_TYPES],
  time_widget_types: [...TIME_WIDGET_TYPES],
};

export const fallbackLayout: Record<string, LayoutItem> = {
  item_time_1: {
    source: "time",
    name: "Timer",
    label: "TIME",
    widget: "text",
    x: 0.13,
    y: 0.07,
    scale_x: 1.15,
    scale_y: 1.08,
    rotation: 0,
    accent_color: "#55beff",
    negative_color: "#55beff",
    positive_color: "#55beff",
    text_color: "#ffffff",
    bg_color: "#141a20",
    bg_visible: true,
    outline_color: "#ffffff",
    outline_visible: true,
    shadow_visible: true,
  },
  item_ch1_1: {
    source: "ch1",
    name: "Steering",
    label: "STEER",
    widget: "gauge",
    x: 0.16,
    y: 0.76,
    scale_x: 1.15,
    scale_y: 1.15,
    rotation: 0,
    accent_color: "#ffd25a",
    negative_color: "#ffaa54",
    positive_color: "#55beff",
    text_color: "#ffffff",
    bg_color: "#141a20",
    bg_visible: true,
    outline_color: "#ffffff",
    outline_visible: true,
    shadow_visible: true,
    ...defaultAppearanceForWidget("gauge"),
  },
  item_ch2_1: {
    source: "ch2",
    name: "Throttle / brake",
    label: "THROTTLE",
    widget: "bar",
    x: 0.86,
    y: 0.72,
    scale_x: 1.75,
    scale_y: 2.35,
    rotation: -90,
    accent_color: "#40d68c",
    negative_color: "#ff5c5c",
    positive_color: "#40d68c",
    text_color: "#ffffff",
    bg_color: "#141a20",
    bg_visible: true,
    outline_color: "#ffffff",
    outline_visible: true,
    shadow_visible: true,
    ...defaultAppearanceForWidget("bar"),
  },
  item_ch3_1: {
    source: "ch3",
    name: "Aux 1",
    label: "AUX 1",
    widget: "bar",
    x: 0.74,
    y: 0.08,
    scale_x: 1.65,
    scale_y: 1,
    rotation: 0,
    accent_color: "#55beff",
    negative_color: "#ffaa54",
    positive_color: "#55beff",
    text_color: "#ffffff",
    bg_color: "#141a20",
    bg_visible: true,
    outline_color: "#ffffff",
    outline_visible: true,
    shadow_visible: true,
    ...defaultAppearanceForWidget("bar"),
  },
  item_ch4_1: {
    source: "ch4",
    name: "Aux 2",
    label: "AUX 2",
    widget: "bar",
    x: 0.74,
    y: 0.15,
    scale_x: 1.65,
    scale_y: 1,
    rotation: 0,
    accent_color: "#ffaa54",
    negative_color: "#ffaa54",
    positive_color: "#55beff",
    text_color: "#ffffff",
    bg_color: "#141a20",
    bg_visible: true,
    outline_color: "#ffffff",
    outline_visible: true,
    shadow_visible: true,
    ...defaultAppearanceForWidget("bar"),
  },
};

export const fallbackItem: LayoutItem = fallbackLayout.item_ch1_1;

function fallbackLayoutClone() {
  return Object.fromEntries(
    Object.entries(fallbackLayout).map(([id, item]) => [id, { ...item }]),
  ) as Record<string, LayoutItem>;
}

export const browserFallbackApi: OverlayApi = {
  metadata: async () => fallbackMetadata,
  defaultLayout: async () => ({ layout: fallbackLayoutClone() }),
  loadSettings: async () => ({ ...defaultSettings, layout: fallbackLayoutClone() }),
  saveSettings: async (settings) => settings,
  chooseCsv: async () => null,
  chooseDirectory: async () => null,
  chooseMovOutput: async () => null,
  chooseFfmpeg: async () => null,
  loadCsvSummary: async () => ({
    csv_path: "",
    sample_count: 0,
    duration_ms: 0,
    scale_mode: "preview",
    sources: fallbackMetadata.sources,
  }),
  previewState: async () => ({ time_ms: 0, state: {} }),
  renderOverlay: async () => ({ frame_count: 0, output_dir: "", video_output: "" }),
  discoverRadios: async () => ({ sources: [] }),
  listRadioLogs: async () => ({ logs: [] }),
  createWidget: async () => ({ item_id: `item_ch1_${Date.now()}`, item: { ...fallbackItem } }),
  discoverFfmpeg: async () => ({ path: null, source: "not found" }),
  downloadFfmpeg: async () => { throw new Error("Not available in browser"); },
  installScripts: async () => { throw new Error("Not available in browser"); },
  onBridgeEvent: () => () => undefined,
};

export const api = window.overlayApi ?? browserFallbackApi;

export function numeric(value: number | string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value: number, low: number, high: number) {
  if (!Number.isFinite(value)) return low;
  return Math.max(low, Math.min(high, value));
}

export function widgetSize(widget: string) {
  return widgetBaseSize(widget);
}

export function itemName(id: string, item: LayoutItem) {
  return item.name || item.label || id;
}

export function widgetTypesForSource(metadata: AppMetadata, source: string) {
  return source === "time" ? metadata.time_widget_types : metadata.channel_widget_types;
}

export function widgetTypeLabel(widget: string) {
  return widget.replace(/_/g, " ");
}

export function interpolateLocalState(samples: CsvSample[], timeMs: number): FrameState {
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

export function itemBounds(item: LayoutItem, frameWidth: number, frameHeight: number): [number, number, number, number] {
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
