import type { LayoutItem } from "../../shared/types";
import { clamp, widgetSize } from "../../shared/util";
import type { ResizePreview, ResizingState } from "../utils";
import { rotateOffset, rotatedPoint } from "./previewGeometry";

interface ResizeCalculationInput {
  point: { x: number; y: number };
  resizing: ResizingState;
  item: LayoutItem;
  outputWidth: number;
  outputHeight: number;
}

export function calculateResizePreview(input: ResizeCalculationInput): ResizePreview {
  const { point, resizing, item, outputWidth, outputHeight } = input;
  const {
    itemId, handle, fixedLocalX, fixedLocalY, origCenterX, origCenterY,
    origWidth, origHeight, origScaleX, origScaleY, rotation,
  } = resizing;
  const [baseW, baseH] = widgetSize(item.widget);
  const scale = Math.max(0.01, Math.min(outputWidth / 1920, outputHeight / 1080));
  const localPointer = rotatedPoint(point.x, point.y, origCenterX, origCenterY, -rotation);
  let movingLocalX = localPointer.x - origCenterX;
  let movingLocalY = localPointer.y - origCenterY;
  let nextWidth = origWidth;
  let nextHeight = origHeight;
  let centerLocalX = 0;
  let centerLocalY = 0;
  const resizingX = fixedLocalX !== null;
  const resizingY = fixedLocalY !== null;

  if (handle.length === 2 && resizingX && resizingY && fixedLocalX !== null && fixedLocalY !== null) {
    const rawWidth = Math.abs(movingLocalX - fixedLocalX);
    const rawHeight = Math.abs(movingLocalY - fixedLocalY);
    const minFactor = Math.max(0.2 / origScaleX, 0.2 / origScaleY, 32 / origWidth, 24 / origHeight);
    const maxFactor = Math.min(12 / origScaleX, 12 / origScaleY);
    const factor = clamp(Math.max(rawWidth / origWidth, rawHeight / origHeight), minFactor, maxFactor);
    nextWidth = origWidth * factor;
    nextHeight = origHeight * factor;
    movingLocalX = fixedLocalX + (handle.includes("w") ? -nextWidth : nextWidth);
    movingLocalY = fixedLocalY + (handle.includes("n") ? -nextHeight : nextHeight);
    centerLocalX = (fixedLocalX + movingLocalX) / 2;
    centerLocalY = (fixedLocalY + movingLocalY) / 2;
  } else {
    if (fixedLocalX !== null) {
      nextWidth = clamp(Math.abs(movingLocalX - fixedLocalX), 32, baseW * scale * 12);
      movingLocalX = fixedLocalX + (handle.includes("w") ? -nextWidth : nextWidth);
      centerLocalX = (fixedLocalX + movingLocalX) / 2;
    }
    if (fixedLocalY !== null) {
      nextHeight = clamp(Math.abs(movingLocalY - fixedLocalY), 24, baseH * scale * 12);
      movingLocalY = fixedLocalY + (handle.includes("n") ? -nextHeight : nextHeight);
      centerLocalY = (fixedLocalY + movingLocalY) / 2;
    }
  }

  const centerOffset = rotateOffset(centerLocalX, centerLocalY, rotation);
  return {
    itemId,
    x: clamp((origCenterX + centerOffset.x) / outputWidth, 0.01, 0.99),
    y: clamp((origCenterY + centerOffset.y) / outputHeight, 0.01, 0.99),
    scaleX: clamp(nextWidth / (baseW * scale), 0.2, 12),
    scaleY: clamp(nextHeight / (baseH * scale), 0.2, 12),
  };
}
