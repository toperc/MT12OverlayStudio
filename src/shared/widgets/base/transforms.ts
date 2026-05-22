import type { LayoutItem } from "../../types";
import { clamp } from "./helpers";
import type { SourceStats } from "./types";

export function applyTransforms(
  value: number,
  transforms: string[] | undefined,
  stats: SourceStats | undefined,
  item: LayoutItem,
): number {
  if (!transforms?.length) return value;
  let v = value;
  for (const t of transforms) {
    switch (t) {
      case "min": v = stats?.min ?? v; break;
      case "max": v = stats?.max ?? v; break;
      case "avg": v = stats?.avg ?? v; break;
      case "%": {
        const rMin = item.range_min ?? -1024;
        const rCenter = item.range_center ?? 0;
        const rMax = item.range_max ?? 1024;
        const half = v >= rCenter ? (rMax - rCenter) : (rCenter - rMin);
        v = half === 0 ? 0 : clamp(((v - rCenter) / half) * 100, -100, 100);
        break;
      }
    }
  }
  return v;
}
