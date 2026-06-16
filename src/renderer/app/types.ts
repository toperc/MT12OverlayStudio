import type { AppSettings, LayoutItem } from "../../shared/types";

export type CurrentView = "source" | "layout" | "export" | "install";
export type InputMode = "manual" | "radio";
export type InstallMode = "manual" | "auto";

export type LayoutSnapshot = {
  layout: AppSettings["layout"];
  selectedItemId: string;
};

export function isKeyboardEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

export function cloneLayoutItem(item: LayoutItem) {
  const nextItem = { ...item };
  if (item.transforms) nextItem.transforms = [...item.transforms];
  return nextItem;
}

export function cloneLayout(layout: AppSettings["layout"]) {
  const copy: AppSettings["layout"] = {};
  for (const [id, item] of Object.entries(layout ?? {})) {
    copy[id] = cloneLayoutItem(item);
  }
  return copy;
}
