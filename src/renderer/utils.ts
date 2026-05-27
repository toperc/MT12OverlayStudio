import type { AppMetadata, AppSettings, LayoutItem } from "../shared/types";

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
  channel_widget_types: ["gauge", "bar", "text"],
  time_widget_types: ["text"],
};

export const api = window.overlayApi;

export function itemName(id: string, item: LayoutItem) {
  return item.name || item.label || id;
}

export function widgetTypeLabel(widget: string) {
  return widget.replace(/_/g, " ");
}

export type ColorKey = "accent_color" | "negative_color" | "positive_color" | "text_color" | "bg_color" | "outline_color";

export function colorControlLabel(item: LayoutItem, key: ColorKey): string | null {
  if (item.source === "time" || item.widget === "text") {
    const labels: Record<ColorKey, string | null> = {
      accent_color: null,
      negative_color: null,
      positive_color: null,
      text_color: null,
      bg_color: "colors.boxFill",
      outline_color: "colors.boxOutline",
    };
    return labels[key];
  }

  if (item.widget === "gauge") {
    const labels: Record<ColorKey, string | null> = {
      accent_color: "colors.spokeHub",
      negative_color: null,
      positive_color: null,
      text_color: null,
      bg_color: "colors.gaugeFill",
      outline_color: "colors.gaugeOutline",
    };
    return labels[key];
  }

  if (item.widget === "bar") {
    const labels: Record<ColorKey, string | null> = {
      accent_color: null,
      negative_color: "colors.negativeFill",
      positive_color: "colors.positiveFill",
      text_color: "colors.centerMark",
      bg_color: "colors.trackFill",
      outline_color: "colors.trackOutline",
    };
    return labels[key];
  }

  return key;
}
