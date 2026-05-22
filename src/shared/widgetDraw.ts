import type { CsvSample, LayoutItem } from "./types";
import { applyTransforms } from "./widgets/base/transforms";
import { clamp, optionalNumber } from "./widgets/base/helpers";
import type { DrawCtx, FrameState, RunningStats } from "./widgets/base/types";
import { getWidgetDefinition, widgetBaseSize } from "./widgets/registry";

export type {
  DrawCtx,
  FrameState,
  RunningStats,
  SourceStats,
} from "./widgets/base/types";

export function buildRunningStatsArray(samples: CsvSample[]): RunningStats[] {
  const acc: Record<string, { min: number; max: number; sum: number; count: number }> = {};
  return samples.map((s) => {
    for (const [src, val] of Object.entries(s.values)) {
      if (!acc[src]) { acc[src] = { min: val, max: val, sum: val, count: 1 }; continue; }
      if (val < acc[src].min) acc[src].min = val;
      if (val > acc[src].max) acc[src].max = val;
      acc[src].sum += val;
      acc[src].count++;
    }
    const snap: RunningStats = {};
    for (const [src, a] of Object.entries(acc)) {
      snap[src] = { min: a.min, max: a.max, avg: a.sum / a.count };
    }
    return snap;
  });
}

export function getRunningStatsAt(statsArray: RunningStats[], samples: CsvSample[], timeMs: number): RunningStats {
  if (!statsArray.length || !samples.length) return {};
  if (timeMs <= samples[0].time_ms) return statsArray[0];
  const last = samples.length - 1;
  if (timeMs >= samples[last].time_ms) return statsArray[last];
  let lo = 0, hi = last;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (samples[mid].time_ms <= timeMs) lo = mid; else hi = mid; }
  return statsArray[lo];
}

function itemBoundsFromLayout(
  item: LayoutItem,
  fw: number,
  fh: number,
): [number, number, number, number] {
  const [bw, bh] = widgetBaseSize(item.widget);
  const s = clamp(Math.min(fw / 1920, fh / 1080), 0.1, 8);
  const w = Math.max(32, bw * s * (item.scale_x || 1));
  const h = Math.max(24, bh * s * (item.scale_y || 1));
  const cx = item.x * fw;
  const cy = item.y * fh;
  const left = clamp(cx - w / 2, 0, Math.max(0, fw - w));
  const top = clamp(cy - h / 2, 0, Math.max(0, fh - h));
  return [left, top, left + w, top + h];
}

function valueForSource(state: FrameState, source: string): number {
  const value = Number(state[source]);
  return Number.isFinite(value) ? value : 0;
}

function drawWidget(
  ctx: DrawCtx,
  item: LayoutItem,
  state: FrameState,
  runningStats: RunningStats,
  timeMs: number,
  fw: number,
  fh: number,
) {
  const [left, top, right, bottom] = itemBoundsFromLayout(item, fw, fh);
  const width = right - left;
  const height = bottom - top;
  const scale = clamp(Math.min(fw / 1920, fh / 1080), 0.1, 8);
  const rotation = (optionalNumber(item.rotation, 0, -180, 180) * Math.PI) / 180;
  const rawValue = valueForSource(state, item.source);
  const stats = runningStats[item.source];
  const value = Math.round(applyTransforms(rawValue, item.transforms, stats, item));
  const normDiv = item.transforms?.includes("%") ? 100 : 1024;
  const normalizedValue = clamp(value / normDiv, -1, 1);
  const widget = getWidgetDefinition(item.widget);

  ctx.save();
  ctx.translate(left + width / 2, top + height / 2);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.translate(-width / 2, -height / 2);
  widget.draw(ctx, { item, value, normalizedValue, rawValue, timeMs, width, height, scale });
  ctx.restore();
}

export function renderFrame(
  ctx: DrawCtx,
  layout: Record<string, unknown>,
  state: FrameState,
  runningStats: RunningStats,
  timeMs: number,
  frameWidth: number,
  frameHeight: number,
) {
  ctx.clearRect(0, 0, frameWidth, frameHeight);

  for (const item of Object.values(layout)) {
    if (!item || typeof item !== "object") continue;
    try {
      drawWidget(ctx, item as unknown as LayoutItem, state, runningStats, timeMs, frameWidth, frameHeight);
    } catch {
      // skip failed widget without aborting the frame
    }
  }
}
