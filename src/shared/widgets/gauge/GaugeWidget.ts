import type { LayoutItem } from "../../types";
import { BaseWidget } from "../base/BaseWidget";
import { BG_ALPHA, optionalNumber, rgba, rrect } from "../base/helpers";
import type { AppearanceGroup, ColorKey, DrawCtx, WidgetDrawArgs } from "../base/types";

const GAUGE_OUTLINE_THICKNESS = 6;
const GAUGE_SPOKE_THICKNESS = 8;
const GAUGE_HUB_SIZE = 16;

export class GaugeWidget extends BaseWidget {
  constructor() {
    super("gauge", [250, 250]);
  }

  defaultAppearance(): Partial<LayoutItem> {
    return {
      gauge_outline_thickness: GAUGE_OUTLINE_THICKNESS,
      gauge_spoke_thickness: GAUGE_SPOKE_THICKNESS,
      gauge_hub_size: GAUGE_HUB_SIZE,
    };
  }

  sanitizeAppearance(userItem: Record<string, unknown>, defaults: Record<string, unknown>): Partial<LayoutItem> {
    return {
      gauge_outline_thickness: this.numberProp(userItem, defaults, "gauge_outline_thickness", GAUGE_OUTLINE_THICKNESS, 0, 32),
      gauge_spoke_thickness: this.numberProp(userItem, defaults, "gauge_spoke_thickness", GAUGE_SPOKE_THICKNESS, 1, 40),
      gauge_hub_size: this.numberProp(userItem, defaults, "gauge_hub_size", GAUGE_HUB_SIZE, 4, 50),
    };
  }

  appearanceGroups(): AppearanceGroup[] {
    return [
      {
        titleKey: "layout.subgroupGaugeNeedle",
        controls: [
          { kind: "color", key: "accent_color", labelKey: "colors.spokeHub" },
          {
            kind: "number",
            key: "gauge_spoke_thickness",
            labelKey: "layout.gaugeSpokeThickness",
            defaultValue: GAUGE_SPOKE_THICKNESS,
            min: 1,
            max: 40,
            step: 1,
          },
          {
            kind: "number",
            key: "gauge_hub_size",
            labelKey: "layout.gaugeHubSize",
            defaultValue: GAUGE_HUB_SIZE,
            min: 4,
            max: 50,
            step: 1,
          },
        ],
      },
      {
        titleKey: "colors.gaugeFill",
        controls: [
          { kind: "color", key: "bg_color", labelKey: "layout.controlColor" },
        ],
      },
      {
        titleKey: "colors.gaugeOutline",
        controls: [
          { kind: "color", key: "outline_color", labelKey: "layout.controlColor" },
          {
            kind: "number",
            key: "gauge_outline_thickness",
            labelKey: "layout.gaugeOutlineThickness",
            defaultValue: GAUGE_OUTLINE_THICKNESS,
            min: 0,
            max: 32,
            step: 1,
          },
        ],
      },
    ];
  }

  colorLabel(key: ColorKey): string | null {
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

  draw(ctx: DrawCtx, args: WidgetDrawArgs) {
    const { item, normalizedValue: value, width: w, height: h, scale: sc } = args;
    const outerDiam = Math.min(w, h);
    const outerR = outerDiam / 2;
    const cx = w / 2;
    const cy = h / 2;
    const outlineW = item.outline_visible !== false
      ? Math.min(optionalNumber(item.gauge_outline_thickness, GAUGE_OUTLINE_THICKNESS, 0, 32) * sc, outerR)
      : 0;
    const ringR = Math.max(0, outerR - outlineW / 2);
    const ringDiam = ringR * 2;

    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    if (item.bg_visible !== false) {
      ctx.fillStyle = rgba(item.bg_color, BG_ALPHA);
      ctx.fill();
    }

    const spokeW = Math.max(1, optionalNumber(item.gauge_spoke_thickness, GAUGE_SPOKE_THICKNESS, 1, 40) * sc);
    const spokeH = 0.42 * ringDiam;
    const angle = value * 150 * (Math.PI / 180);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    rrect(ctx, -spokeW / 2, -spokeH, spokeW, spokeH, spokeW / 2);
    ctx.fillStyle = item.accent_color;
    ctx.fill();
    ctx.restore();

    const hubR = (optionalNumber(item.gauge_hub_size, GAUGE_HUB_SIZE, 4, 50) / 100) * ringDiam / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, hubR), 0, Math.PI * 2);
    ctx.fillStyle = item.accent_color;
    ctx.fill();

    if (outlineW > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = item.outline_color;
      ctx.lineWidth = outlineW;
      ctx.stroke();
    }
  }
}
