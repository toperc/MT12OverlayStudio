import { widgetTypesForSource } from "../../shared/util";
import type { AppState } from "./useAppState";

export function useChangeSelectedSource(
  state: AppState,
  rememberLayoutUndo: () => void,
) {
  const { metadata, selectedItemId, setSettings, latestSettingsRef } = state;

  return function changeSelectedSource(source: string) {
    if (!selectedItemId) return;
    const item = latestSettingsRef.current.layout[selectedItemId];
    if (!item) return;
    const allowed = widgetTypesForSource(metadata, source);
    const widget = allowed.includes(item.widget) ? item.widget : allowed[0];
    if (item.source === source && item.widget === widget) return;
    rememberLayoutUndo();
    setSettings((current) => {
      const currentItem = current.layout[selectedItemId];
      if (!currentItem) return current;
      const nextWidget = allowed.includes(currentItem.widget) ? currentItem.widget : allowed[0];
      if (currentItem.source === source && currentItem.widget === nextWidget) return current;
      const next = {
        ...current,
        layout: { ...current.layout, [selectedItemId]: { ...currentItem, source, widget: nextWidget } },
      };
      latestSettingsRef.current = next;
      return next;
    });
  };
}
