import type React from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AppSettings } from "../../shared/types";
import type { ResizePreview } from "../utils";

export function commitResizePreview(input: {
  preview: ResizePreview;
  latestSettingsRef: React.MutableRefObject<AppSettings>;
  rememberLayoutUndo: () => void;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
}) {
  const { preview, latestSettingsRef, rememberLayoutUndo, setSettings } = input;
  const item = latestSettingsRef.current.layout[preview.itemId];
  if (
    item &&
    (item.x !== preview.x ||
      item.y !== preview.y ||
      item.scale_x !== preview.scaleX ||
      item.scale_y !== preview.scaleY)
  ) {
    rememberLayoutUndo();
  }
  setSettings((current) => {
    const currentItem = current.layout[preview.itemId];
    if (!currentItem) return current;
    const next = {
      ...current,
      layout: {
        ...current.layout,
        [preview.itemId]: {
          ...currentItem,
          x: preview.x,
          y: preview.y,
          scale_x: preview.scaleX,
          scale_y: preview.scaleY,
        },
      },
    };
    latestSettingsRef.current = next;
    return next;
  });
}
