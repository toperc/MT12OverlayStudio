import type React from "react";
import { clamp } from "../../shared/util";
import type { LayoutItem } from "../../shared/types";
import type { HandleId, ResizePreview } from "../utils";
import { pointerToFrame, previewItemBounds } from "./previewBounds";
import { commitResizePreview as commitPreviewResize } from "./previewCommit";
import {
  locateItemAt,
  resizeCursor,
  resizeHandlePoints,
} from "./previewGeometry";
import { calculateResizePreview } from "./previewResize";
import type { AppState } from "./useAppState";
import { usePreviewViewport } from "./usePreviewViewport";
export function usePreviewInteraction(
  state: AppState,
  selectLayoutItem: (id: string) => void,
  moveWidget: (itemId: string, x: number, y: number) => void,
  rememberLayoutUndo: () => void,
) {
  const {
    settings, summary, layoutItems, outputWidth, outputHeight,
    selectedItemId, previewZoom, previewOffset, dragPreview,
    resizePreview, setDragPreview, setResizePreview, setPreviewCursor,
    setPreviewOffset, previewStageRef, draggingItemRef,
    dragPreviewRef, dragRafRef, resizingRef, resizePreviewRef,
    resizeRafRef, panStartRef, latestSettingsRef, setSettings,
  } = state;
  const viewport = usePreviewViewport(state);
  function previewPointerToFrame(event: React.PointerEvent<HTMLElement>) {
    return pointerToFrame(event, previewStageRef.current, outputWidth, outputHeight);
  }

  function boundsForPreviewItem(id: string, item: LayoutItem) {
    return previewItemBounds({ item, resizePreview, dragPreview, id, outputWidth, outputHeight });
  }
  function scheduleDragPreview(itemId: string, x: number, y: number) {
    dragPreviewRef.current = { itemId, x, y };
    if (dragRafRef.current !== null) return;
    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = null;
      setDragPreview(dragPreviewRef.current);
    });
  }
  function scheduleResizePreview(preview: ResizePreview) {
    resizePreviewRef.current = preview;
    if (resizeRafRef.current !== null) return;
    resizeRafRef.current = window.requestAnimationFrame(() => {
      resizeRafRef.current = null;
      setResizePreview(resizePreviewRef.current);
    });
  }
  function locateResizeHandle(frameX: number, frameY: number): HandleId | null {
    if (!selectedItemId || !previewStageRef.current) return null;
    const item = settings.layout[selectedItemId];
    if (!item) return null;
    const bounds = boundsForPreviewItem(selectedItemId, item);
    const stageRect = previewStageRef.current.getBoundingClientRect();
    const hit = 10 * (outputWidth / (stageRect.width / previewZoom));
    for (const [id, hx, hy] of resizeHandlePoints(item, bounds)) {
      if (Math.hypot(frameX - hx, frameY - hy) <= hit) return id;
    }
    return null;
  }
  function handlePreviewPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const point = previewPointerToFrame(event);
    const handle = point ? locateResizeHandle(point.x, point.y) : null;
    if (handle && point && selectedItemId) {
      const item = settings.layout[selectedItemId];
      if (item) {
        const [l, t, r, b] = boundsForPreviewItem(selectedItemId, item);
        const width = r - l;
        const height = b - t;
        resizingRef.current = {
          itemId: selectedItemId,
          handle,
          fixedLocalX: handle === "n" || handle === "s" ? null : handle.includes("w") ? width / 2 : -width / 2,
          fixedLocalY: handle === "e" || handle === "w" ? null : handle.includes("n") ? height / 2 : -height / 2,
          origCenterX: (l + r) / 2,
          origCenterY: (t + b) / 2,
          origWidth: width,
          origHeight: height,
          origScaleX: item.scale_x,
          origScaleY: item.scale_y,
          rotation: item.rotation ?? 0,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
    }
    const found = summary && layoutItems.length && point
      ? locateItemAt(point.x, point.y, layoutItems, outputWidth, outputHeight)
      : null;
    if (found && point) {
      const [l, t, r, b] = found.bounds;
      const cx = (l + r) / 2;
      const cy = (t + b) / 2;
      draggingItemRef.current = { itemId: found.id, dx: point.x - cx, dy: point.y - cy };
      scheduleDragPreview(found.id, cx / point.frameWidth, cy / point.frameHeight);
      selectLayoutItem(found.id);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    panStartRef.current = { cx: event.clientX, cy: event.clientY, ox: previewOffset.x, oy: previewOffset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    const point = previewPointerToFrame(event);
    const resizing = resizingRef.current;
    if (!point || !resizing) return;
    const item = settings.layout[resizing.itemId];
    if (!item) return;
    scheduleResizePreview(calculateResizePreview({
      point,
      resizing,
      item,
      outputWidth,
      outputHeight,
    }));
  }

  function handlePreviewPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (resizingRef.current) {
      handleResizeMove(event);
      return;
    }
    if (panStartRef.current) {
      setPreviewOffset({
        x: panStartRef.current.ox + event.clientX - panStartRef.current.cx,
        y: panStartRef.current.oy + event.clientY - panStartRef.current.cy,
      });
      return;
    }
    if (draggingItemRef.current) {
      const point = previewPointerToFrame(event);
      if (!point) return;
      const cx = clamp(point.x - draggingItemRef.current.dx, 0, point.frameWidth);
      const cy = clamp(point.y - draggingItemRef.current.dy, 0, point.frameHeight);
      scheduleDragPreview(
        draggingItemRef.current.itemId,
        clamp(cx / point.frameWidth, 0.05, 0.95),
        clamp(cy / point.frameHeight, 0.05, 0.95),
      );
      return;
    }
    const point = previewPointerToFrame(event);
    if (!point) return;
    const handle = locateResizeHandle(point.x, point.y);
    if (handle) {
      const item = selectedItemId ? settings.layout[selectedItemId] : undefined;
      setPreviewCursor(resizeCursor(handle, item?.rotation ?? 0));
      return;
    }
    const found = summary && layoutItems.length
      ? locateItemAt(point.x, point.y, layoutItems, outputWidth, outputHeight)
      : null;
    setPreviewCursor(found ? "grab" : "default");
  }
  function handlePreviewPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const release = () => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };
    if (resizingRef.current) {
      const r = resizePreviewRef.current;
      if (r) {
        commitPreviewResize({ preview: r, latestSettingsRef, rememberLayoutUndo, setSettings });
      }
      setResizePreview(null);
      resizingRef.current = null;
      resizePreviewRef.current = null;
      release();
      return;
    }
    if (panStartRef.current) {
      panStartRef.current = null;
      release();
      return;
    }
    if (draggingItemRef.current) {
      const committed = dragPreviewRef.current;
      if (committed) moveWidget(committed.itemId, committed.x, committed.y);
      draggingItemRef.current = null;
      dragPreviewRef.current = null;
      setDragPreview(null);
      release();
    }
  }
  return {
    boundsForPreviewItem,
    ...viewport,
    handlePreviewPointerDown,
    handlePreviewPointerMove,
    handlePreviewPointerUp,
  };
}
