import type { LayoutItem } from "../../shared/types";
import { itemBounds } from "../../shared/util";
import type { HandleId } from "../utils";

export function rotatedPoint(x: number, y: number, cx: number, cy: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

export function rotateOffset(x: number, y: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export function pointInItemBounds(
  x: number,
  y: number,
  item: LayoutItem,
  bounds: [number, number, number, number],
) {
  const [left, top, right, bottom] = bounds;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const local = rotatedPoint(x, y, cx, cy, -(item.rotation ?? 0));
  return left <= local.x && local.x <= right && top <= local.y && local.y <= bottom;
}

export function resizeHandlePoints(
  item: LayoutItem,
  bounds: [number, number, number, number],
): [HandleId, number, number][] {
  const [l, t, r, b] = bounds;
  const mx = (l + r) / 2;
  const my = (t + b) / 2;
  const rotation = item.rotation ?? 0;
  const point = (id: HandleId, x: number, y: number): [HandleId, number, number] => {
    const rotated = rotatedPoint(x, y, mx, my, rotation);
    return [id, rotated.x, rotated.y];
  };
  return [
    point("nw", l, t), point("n", mx, t), point("ne", r, t),
    point("w", l, my), point("e", r, my),
    point("sw", l, b), point("s", mx, b), point("se", r, b),
  ];
}

export function resizeCursor(handle: HandleId, rotation = 0) {
  const baseAxis: Record<HandleId, number> = {
    e: 0, w: 0,
    n: 90, s: 90,
    nw: 45, se: 45,
    ne: 135, sw: 135,
  };
  const axis = ((baseAxis[handle] + rotation) % 180 + 180) % 180;
  if (axis < 22.5 || axis >= 157.5) return "ew-resize";
  if (axis < 67.5) return "nwse-resize";
  if (axis < 112.5) return "ns-resize";
  return "nesw-resize";
}

export function locateItemAt(
  x: number,
  y: number,
  layoutItems: [string, LayoutItem][],
  outputWidth: number,
  outputHeight: number,
) {
  for (const [id, item] of [...layoutItems].reverse()) {
    const [left, top, right, bottom] = itemBounds(item, outputWidth, outputHeight);
    const bounds = [left, top, right, bottom] as [number, number, number, number];
    if (pointInItemBounds(x, y, item, bounds)) return { id, bounds };
  }
  return null;
}
