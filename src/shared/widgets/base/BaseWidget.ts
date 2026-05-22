import type { LayoutItem } from "../../types";
import { sanitizedNumber } from "./helpers";
import type { AppearanceGroup, ColorKey, DrawCtx, WidgetDrawArgs } from "./types";

export abstract class BaseWidget {
  constructor(
    readonly type: string,
    readonly baseSize: [number, number],
  ) {}

  defaultAppearance(): Partial<LayoutItem> {
    return {};
  }

  sanitizeAppearance(_userItem: Record<string, unknown>, _defaults: Record<string, unknown>): Partial<LayoutItem> {
    return {};
  }

  appearanceGroups(): AppearanceGroup[] {
    return [];
  }

  colorLabel(_key: ColorKey, _item: LayoutItem): string | null {
    return null;
  }

  protected numberProp(
    userItem: Record<string, unknown>,
    defaults: Record<string, unknown>,
    key: keyof LayoutItem,
    fallback: number,
    low: number,
    high: number,
  ) {
    return sanitizedNumber(userItem, defaults, String(key), fallback, low, high);
  }

  abstract draw(ctx: DrawCtx, args: WidgetDrawArgs): void;
}
