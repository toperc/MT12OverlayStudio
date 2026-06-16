import { useEffect } from "react";
import { clamp } from "../../shared/util";
import { isKeyboardEditingTarget } from "./types";
import type { AppState } from "./useAppState";

interface LayoutKeyboardActions {
  undoLayoutChange: () => void;
  copySelectedWidget: () => void;
  pasteCopiedWidget: () => Promise<void>;
  deleteWidget: () => void;
  clearPreviewEditState: () => void;
  rememberLayoutUndo: () => void;
}

export function useLayoutKeyboard(state: AppState, actions: LayoutKeyboardActions) {
  const {
    currentView, selectedItemId, outputWidth, outputHeight,
    latestSettingsRef, setSettings,
  } = state;

  function moveSelectedWidgetByPixels(dx: number, dy: number) {
    if (!selectedItemId) return;
    actions.clearPreviewEditState();
    const currentItem = latestSettingsRef.current.layout[selectedItemId];
    if (!currentItem) return;
    const nextX = clamp(currentItem.x + dx / outputWidth, 0.05, 0.95);
    const nextY = clamp(currentItem.y + dy / outputHeight, 0.05, 0.95);
    if (nextX === currentItem.x && nextY === currentItem.y) return;
    actions.rememberLayoutUndo();
    setSettings((current) => {
      const item = current.layout[selectedItemId];
      if (!item) return current;
      const x = clamp(item.x + dx / outputWidth, 0.05, 0.95);
      const y = clamp(item.y + dy / outputHeight, 0.05, 0.95);
      if (x === item.x && y === item.y) return current;
      const next = { ...current, layout: { ...current.layout, [selectedItemId]: { ...item, x, y } } };
      latestSettingsRef.current = next;
      return next;
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (currentView !== "layout") return;
      if (event.defaultPrevented || isKeyboardEditingTarget(event.target)) return;
      const shortcutPressed = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
      if (shortcutPressed && handleShortcut(event)) return;
      if (!selectedItemId || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Delete") {
        event.preventDefault();
        actions.deleteWidget();
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const movement: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = movement[event.key];
      if (!delta) return;
      event.preventDefault();
      moveSelectedWidgetByPixels(delta[0], delta[1]);
    }

    function handleShortcut(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === "z") actions.undoLayoutChange();
      else if (key === "c") actions.copySelectedWidget();
      else if (key === "v") void actions.pasteCopiedWidget();
      else return false;
      event.preventDefault();
      return true;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, selectedItemId, outputWidth, outputHeight]);
}
