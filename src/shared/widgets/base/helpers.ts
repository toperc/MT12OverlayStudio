import type { DrawCtx } from "./types";

export const BG_ALPHA = 170 / 255;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function optionalNumber(value: number | undefined, fallback: number, low: number, high: number): number {
  const parsed = Number(value ?? fallback);
  return clamp(Number.isFinite(parsed) ? parsed : fallback, low, high);
}

export function sanitizedNumber(
  userItem: Record<string, unknown>,
  defaults: Record<string, unknown>,
  key: string,
  fallback: number,
  low: number,
  high: number,
) {
  return clamp(Number(userItem[key] ?? defaults[key] ?? fallback), low, high);
}

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function rrect(ctx: DrawCtx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

export function formatValue(value: number): string {
  const v = Math.round(value);
  return `${v >= 0 ? "+" : ""}${v}`;
}
