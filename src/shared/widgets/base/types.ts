import type { LayoutItem } from "../../types";

export type FrameState = Record<string, number>;
export type SourceStats = { min: number; max: number; avg: number };
export type RunningStats = Record<string, SourceStats>;

export type ColorKey =
  | "accent_color"
  | "negative_color"
  | "positive_color"
  | "text_color"
  | "bg_color"
  | "outline_color";

export interface DrawCtx {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
  clip(): void;
  fill(): void;
  stroke(): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  font: string;
  textAlign: string;
  textBaseline: string;
}

export type WidgetDrawArgs = {
  item: LayoutItem;
  value: number;
  normalizedValue: number;
  rawValue: number;
  timeMs: number;
  width: number;
  height: number;
  scale: number;
};

export type ColorAppearanceControl = {
  kind: "color";
  key: ColorKey;
  labelKey: string;
};

export type NumberAppearanceControl = {
  kind: "number";
  key: keyof LayoutItem;
  labelKey: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
};

export type AppearanceControl = ColorAppearanceControl | NumberAppearanceControl;

export type AppearanceGroup = {
  titleKey?: string;
  controls: AppearanceControl[];
};
