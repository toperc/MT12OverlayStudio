import type { LayoutItem } from "../../types";
import { BaseWidget } from "../base/BaseWidget";
import { BG_ALPHA, optionalNumber, rgba, rrect } from "../base/helpers";
import type { AppearanceGroup, ColorKey, DrawCtx, WidgetDrawArgs } from "../base/types";

const BAR_TRACK_OUTLINE_THICKNESS = 3;
const BAR_CENTER_MARK_THICKNESS = 2;
const BAR_CORNER_RADIUS = 100;

export class BarWidget extends BaseWidget {
  constructor() {
    super("bar", [220, 48]);
  }

  defaultAppearance(): Partial<LayoutItem> {
    return {
      bar_track_outline_thickness: BAR_TRACK_OUTLINE_THICKNESS,
      bar_center_mark_thickness: BAR_CENTER_MARK_THICKNESS,
      bar_corner_radius: BAR_CORNER_RADIUS,
    };
  }

  sanitizeAppearance(userItem: Record<string, unknown>, defaults: Record<string, unknown>): Partial<LayoutItem> {
    return {
      bar_track_outline_thickness: this.numberProp(userItem, defaults, "bar_track_outline_thickness", BAR_TRACK_OUTLINE_THICKNESS, 0, 24),
      bar_center_mark_thickness: this.numberProp(userItem, defaults, "bar_center_mark_thickness", BAR_CENTER_MARK_THICKNESS, 0, 24),
      bar_corner_radius: this.numberProp(userItem, defaults, "bar_corner_radius", BAR_CORNER_RADIUS, 0, 100),
    };
  }

  appearanceGroups(): AppearanceGroup[] {
    return [
      {
        titleKey: "layout.subgroupBarFills",
        controls: [
          { kind: "color", key: "negative_color", labelKey: "colors.negativeFill" },
          { kind: "color", key: "positive_color", labelKey: "colors.positiveFill" },
        ],
      },
      {
        titleKey: "colors.centerMark",
        controls: [
          { kind: "color", key: "text_color", labelKey: "layout.controlColor" },
          {
            kind: "number",
            key: "bar_center_mark_thickness",
            labelKey: "layout.controlThickness",
            defaultValue: BAR_CENTER_MARK_THICKNESS,
            min: 0,
            max: 24,
            step: 1,
          },
        ],
      },
      {
        titleKey: "colors.trackFill",
        controls: [
          { kind: "color", key: "bg_color", labelKey: "layout.controlColor" },
        ],
      },
      {
        titleKey: "colors.trackOutline",
        controls: [
          { kind: "color", key: "outline_color", labelKey: "layout.controlColor" },
          {
            kind: "number",
            key: "bar_track_outline_thickness",
            labelKey: "layout.controlThickness",
            defaultValue: BAR_TRACK_OUTLINE_THICKNESS,
            min: 0,
            max: 24,
            step: 1,
          },
        ],
      },
      {
        titleKey: "layout.subgroupBarAppearance",
        controls: [
          {
            kind: "number",
            key: "bar_corner_radius",
            labelKey: "layout.barCornerRadius",
            defaultValue: BAR_CORNER_RADIUS,
            min: 0,
            max: 100,
            step: 1,
          },
        ],
      },
    ];
  }

  colorLabel(key: ColorKey): string | null {
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

  draw(ctx: DrawCtx, args: WidgetDrawArgs) {
    const { item, normalizedValue: value, width: w, height: h, scale: sc } = args;
    const trackW = w;
    const trackH = h;
    const trackX = (w - trackW) / 2;
    const trackY = (h - trackH) / 2;
    const outlineW = item.outline_visible !== false
      ? Math.min(optionalNumber(item.bar_track_outline_thickness, BAR_TRACK_OUTLINE_THICKNESS, 0, 24) * sc, trackW / 2, trackH / 2)
      : 0;
    const innerInset = outlineW;
    const cornerPct = optionalNumber(item.bar_corner_radius, BAR_CORNER_RADIUS, 0, 100) / 100;
    const outerRadius = (trackH / 2) * cornerPct;

    if (item.shadow_visible !== false) {
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10 * sc;
      ctx.shadowBlur = 28 * sc;
    }

    rrect(ctx, trackX + outlineW / 2, trackY + outlineW / 2, trackW - outlineW, trackH - outlineW, outerRadius);
    if (item.bg_visible !== false) {
      ctx.fillStyle = rgba(item.bg_color, BG_ALPHA);
      ctx.fill();
    }
    ctx.shadowColor = "transparent";

    ctx.save();
    const innerW = Math.max(0, trackW - innerInset * 2);
    const innerH = Math.max(0, trackH - innerInset * 2);
    const innerRadius = (innerH / 2) * cornerPct;
    rrect(ctx, trackX + innerInset, trackY + innerInset, innerW, innerH, innerRadius);
    ctx.clip();

    const midX = trackX + innerInset + innerW / 2;
    const fillW = Math.abs(value) * (innerW / 2);
    const fillInset = Math.min(8 * sc, Math.max(0, (innerH - sc) / 2));
    const fillH = Math.max(0, innerH - fillInset * 2);
    const fillY = trackY + innerInset + fillInset;
    const fillRadius = (fillH / 2) * cornerPct;
    const fillColor = value >= 0 ? item.positive_color : item.negative_color;
    if (fillW > 0.5 && fillH > 0.5) {
      rrect(ctx, value >= 0 ? midX : midX - fillW, fillY, fillW, fillH, fillRadius);
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    const centerMarkW = optionalNumber(item.bar_center_mark_thickness, BAR_CENTER_MARK_THICKNESS, 0, 24) * sc;
    if (centerMarkW > 0 && fillH > 0.5) {
      ctx.fillStyle = item.text_color;
      ctx.fillRect(midX - centerMarkW / 2, fillY, centerMarkW, fillH);
    }

    ctx.restore();

    if (item.outline_visible !== false && outlineW > 0) {
      rrect(ctx, trackX + outlineW / 2, trackY + outlineW / 2, trackW - outlineW, trackH - outlineW, outerRadius);
      ctx.strokeStyle = item.outline_color;
      ctx.lineWidth = outlineW;
      ctx.stroke();
    }
  }
}
