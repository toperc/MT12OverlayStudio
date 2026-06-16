import type { AppSettings, LayoutItem } from "../../shared/types";
import { clamp } from "../../shared/util";
import { api } from "../utils";
import { cloneLayout, cloneLayoutItem } from "./types";
import type { AppState } from "./useAppState";
import { useChangeSelectedSource } from "./useChangeSelectedSource";
import { useLayoutKeyboard } from "./useLayoutKeyboard";
export function useLayoutCommands(state: AppState) {
  const {
    metadata, settings, selectedItem, selectedItemId, setSettings, setSelectedItemId,
    draggingItemRef, dragPreviewRef, resizingRef, resizePreviewRef,
    setDragPreview, setResizePreview, latestSettingsRef,
    selectedItemIdRef, layoutUndoStackRef, widgetClipboardRef,
  } = state;
  function selectLayoutItem(id: string) {
    selectedItemIdRef.current = id;
    setSelectedItemId(id);
  }

  function rememberLayoutUndo(layout = latestSettingsRef.current.layout, itemId = selectedItemIdRef.current) {
    layoutUndoStackRef.current.push({ layout: cloneLayout(layout), selectedItemId: itemId });
    if (layoutUndoStackRef.current.length > 100) layoutUndoStackRef.current.shift();
  }
  function clearPreviewEditState() {
    draggingItemRef.current = null;
    dragPreviewRef.current = null;
    resizingRef.current = null;
    resizePreviewRef.current = null;
    setDragPreview(null);
    setResizePreview(null);
  }
  function undoLayoutChange() {
    const snapshot = layoutUndoStackRef.current.pop();
    if (!snapshot) return;
    clearPreviewEditState();
    const restoredLayout = cloneLayout(snapshot.layout);
    const nextSelectedId = restoredLayout[snapshot.selectedItemId]
      ? snapshot.selectedItemId
      : Object.keys(restoredLayout)[0] ?? "";
    selectLayoutItem(nextSelectedId);
    setSettings((current) => {
      const next = { ...current, layout: restoredLayout };
      latestSettingsRef.current = next;
      return next;
    });
  }

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateSelectedItem<K extends keyof LayoutItem>(key: K, value: LayoutItem[K]) {
    if (!selectedItemId) return;
    const item = latestSettingsRef.current.layout[selectedItemId];
    if (!item || Object.is(item[key], value)) return;
    rememberLayoutUndo();
    setSettings((current) => {
      const currentItem = current.layout[selectedItemId];
      if (!currentItem || Object.is(currentItem[key], value)) return current;
      const next = {
        ...current,
        layout: { ...current.layout, [selectedItemId]: { ...currentItem, [key]: value } },
      };
      latestSettingsRef.current = next;
      return next;
    });
  }

  function updateSelectedNumber(key: keyof LayoutItem, value: string, low: number, high: number) {
    updateSelectedItem(key, clamp(Number(value), low, high) as never);
  }

  async function addWidget() {
    const source = selectedItem?.source ?? metadata.sources.find((item) => item !== "time") ?? "ch1";
    const result = await api.createWidget({ source, layout: settings.layout });
    rememberLayoutUndo();
    setSettings((current) => {
      const next = { ...current, layout: { ...current.layout, [result.item_id]: result.item } };
      latestSettingsRef.current = next;
      return next;
    });
    selectLayoutItem(result.item_id);
  }

  async function duplicateWidget() {
    if (!selectedItemId || !selectedItem) return;
    const result = await api.createWidget({ source: selectedItem.source, layout: settings.layout });
    const copy = {
      ...result.item,
      ...selectedItem,
      name: `${selectedItem.name || selectedItem.label || selectedItem.source} Copy`,
      x: clamp(selectedItem.x + 0.04, 0.05, 0.95),
      y: clamp(selectedItem.y + 0.04, 0.05, 0.95),
    };
    rememberLayoutUndo();
    setSettings((current) => {
      const next = { ...current, layout: { ...current.layout, [result.item_id]: copy } };
      latestSettingsRef.current = next;
      return next;
    });
    selectLayoutItem(result.item_id);
  }

  function copySelectedWidget() {
    const item = latestSettingsRef.current.layout[selectedItemIdRef.current];
    if (item) widgetClipboardRef.current = cloneLayoutItem(item);
  }

  async function pasteCopiedWidget() {
    const copiedItem = widgetClipboardRef.current;
    if (!copiedItem) return;
    const currentLayout = latestSettingsRef.current.layout;
    const anchorItem = currentLayout[selectedItemIdRef.current] ?? copiedItem;
    const result = await api.createWidget({ source: copiedItem.source, layout: currentLayout });
    const name = copiedItem.name || copiedItem.label || copiedItem.source;
    const pastedItem = {
      ...result.item,
      ...cloneLayoutItem(copiedItem),
      name: `${name} Copy`,
      x: clamp(anchorItem.x + 0.04, 0.05, 0.95),
      y: clamp(anchorItem.y + 0.04, 0.05, 0.95),
    };
    rememberLayoutUndo();
    setSettings((current) => {
      const next = { ...current, layout: { ...current.layout, [result.item_id]: pastedItem } };
      latestSettingsRef.current = next;
      return next;
    });
    selectLayoutItem(result.item_id);
  }

  function deleteWidget() {
    if (!selectedItemId || !latestSettingsRef.current.layout[selectedItemId]) return;
    rememberLayoutUndo();
    setSettings((current) => {
      const nextLayout = { ...current.layout };
      delete nextLayout[selectedItemId];
      selectLayoutItem(Object.keys(nextLayout)[0] ?? "");
      const next = { ...current, layout: nextLayout };
      latestSettingsRef.current = next;
      return next;
    });
  }

  function resetLayout() {
    void api.defaultLayout().then((loaded) => {
      rememberLayoutUndo();
      setSettings((current) => {
        const next = { ...current, layout: loaded.layout };
        latestSettingsRef.current = next;
        return next;
      });
      selectLayoutItem(Object.keys(loaded.layout)[0] ?? "");
    });
  }

  const changeSelectedSource = useChangeSelectedSource(state, rememberLayoutUndo);

  function moveWidget(itemId: string, x: number, y: number) {
    if (!itemId) return;
    const item = latestSettingsRef.current.layout[itemId];
    if (!item || (item.x === x && item.y === y)) return;
    rememberLayoutUndo();
    setSettings((current) => {
      if (!current.layout[itemId]) return current;
      const next = {
        ...current,
        layout: { ...current.layout, [itemId]: { ...current.layout[itemId], x, y } },
      };
      latestSettingsRef.current = next;
      return next;
    });
  }

  useLayoutKeyboard(state, {
    undoLayoutChange,
    copySelectedWidget,
    pasteCopiedWidget,
    deleteWidget,
    clearPreviewEditState,
    rememberLayoutUndo,
  });

  return {
    selectLayoutItem,
    rememberLayoutUndo,
    clearPreviewEditState,
    undoLayoutChange,
    updateSetting,
    updateSelectedItem,
    updateSelectedNumber,
    addWidget,
    duplicateWidget,
    deleteWidget,
    resetLayout,
    changeSelectedSource,
    moveWidget,
  };
}
