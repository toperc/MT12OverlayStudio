import type { AppSettings, LayoutItem } from "../../shared/types";

export type LayoutEntry = [string, LayoutItem];
export type UpdateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
export type UpdateSelectedItem = <K extends keyof LayoutItem>(key: K, value: LayoutItem[K]) => void;
export type UpdateSelectedNumber = (
  key: keyof LayoutItem,
  value: string,
  low: number,
  high: number,
) => void;
