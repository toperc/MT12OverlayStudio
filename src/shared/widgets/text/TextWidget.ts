import type { LayoutItem } from "../../types";
import { BaseWidget } from "../base/BaseWidget";
import { BG_ALPHA, formatValue, rgba, rrect } from "../base/helpers";
import type { AppearanceGroup, ColorKey, DrawCtx, WidgetDrawArgs } from "../base/types";

export class TextWidget extends BaseWidget {
  constructor() {
    super("text", [280, 52]);
  }

  appearanceGroups(): AppearanceGroup[] {
    return [
      {
        controls: [
          { kind: "color", key: "bg_color", labelKey: "colors.boxFill" },
          { kind: "color", key: "outline_color", labelKey: "colors.boxOutline" },
        ],
      },
    ];
  }

  colorLabel(key: ColorKey): string | null {
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

  draw(ctx: DrawCtx, args: WidgetDrawArgs) {
    const { item, value, timeMs, width: w, height: h, scale: sc } = args;
    this.drawBackground(ctx, item, w, h, sc);

    ctx.font = `bold ${Math.max(10, Math.round(h * 0.50))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = item.accent_color;
    const text = item.source === "time" ? `T ${(timeMs / 1000).toFixed(2)}s` : formatValue(value);
    ctx.fillText(text, w / 2, h / 2);
  }

  private drawBackground(ctx: DrawCtx, item: LayoutItem, w: number, h: number, sc: number) {
    const borderW = Math.max(1, 2 * sc);

    if (item.shadow_visible !== false) {
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10 * sc;
      ctx.shadowBlur = 28 * sc;
    }

    rrect(ctx, borderW / 2, borderW / 2, w - borderW, h - borderW, 8 * sc);
    if (item.bg_visible !== false) {
      ctx.fillStyle = rgba(item.bg_color, BG_ALPHA);
      ctx.fill();
    }

    ctx.shadowColor = "transparent";
    if (item.outline_visible !== false) {
      ctx.strokeStyle = item.outline_color;
      ctx.lineWidth = borderW;
      ctx.stroke();
    }
  }
}
