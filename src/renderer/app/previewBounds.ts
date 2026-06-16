import type React from "react";
import type { LayoutItem } from "../../shared/types";
import { clamp, itemBounds } from "../../shared/util";
import type { ResizePreview } from "../utils";

export function pointerToFrame(
  event: React.PointerEvent<HTMLElement>,
  stage: HTMLDivElement | null,
  outputWidth: number,
  outputHeight: number,
) {
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = clamp(((event.clientX - rect.left) / rect.width) * outputWidth, 0, outputWidth);
  const y = clamp(((event.clientY - rect.top) / rect.height) * outputHeight, 0, outputHeight);
  return { x, y, frameWidth: outputWidth, frameHeight: outputHeight };
}

export function previewItemBounds(input: {
  item: LayoutItem;
  resizePreview: ResizePreview | null;
  dragPreview: { itemId: string; x: number; y: number } | null;
  id: string;
  outputWidth: number;
  outputHeight: number;
}) {
  const { item, resizePreview, dragPreview, id, outputWidth, outputHeight } = input;
  if (resizePreview?.itemId === id) {
    return itemBounds(
      { ...item, x: resizePreview.x, y: resizePreview.y, scale_x: resizePreview.scaleX, scale_y: resizePreview.scaleY },
      outputWidth,
      outputHeight,
    );
  }
  const bounds = itemBounds(item, outputWidth, outputHeight);
  if (!dragPreview || dragPreview.itemId !== id) return bounds;
  const [left, top, right, bottom] = bounds;
  const width = right - left;
  const height = bottom - top;
  const centerX = dragPreview.x * outputWidth;
  const centerY = dragPreview.y * outputHeight;
  const nextLeft = clamp(centerX - width / 2, 0, Math.max(0, outputWidth - width));
  const nextTop = clamp(centerY - height / 2, 0, Math.max(0, outputHeight - height));
  return [nextLeft, nextTop, nextLeft + width, nextTop + height] as [number, number, number, number];
}
