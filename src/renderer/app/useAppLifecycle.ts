import { useEffect } from "react";
import type { TFunction } from "i18next";
import type { AppSettings, BridgeEvent, LayoutItem } from "../../shared/types";
import { api, defaultSettings } from "../utils";
import type { AppState } from "./useAppState";

export function useAppLifecycle(
  state: AppState,
  t: TFunction,
  pushLog: (message: string) => void,
  loadCsv: (path?: string, sourceSettings?: AppSettings) => Promise<void>,
  selectLayoutItem: (id: string) => void,
) {
  const {
    setMetadata, setSettings, setProgress, setUpdateStatus,
    dragRafRef, previewScheduleRef, resizeRafRef, latestSettingsRef,
    selectedItemIdRef,
  } = state;

  useEffect(() => {
    latestSettingsRef.current = state.settings;
  }, [state.settings, latestSettingsRef]);

  useEffect(() => {
    selectedItemIdRef.current = state.selectedItemId;
  }, [state.selectedItemId, selectedItemIdRef]);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) window.cancelAnimationFrame(dragRafRef.current);
      if (previewScheduleRef.current !== null) window.cancelAnimationFrame(previewScheduleRef.current);
      if (resizeRafRef.current !== null) window.cancelAnimationFrame(resizeRafRef.current);
    };
  }, []);

  useEffect(() => {
    Promise.all([api.metadata(), api.loadSettings()]).then(([loadedMetadata, loadedSettings]) => {
      const merged = { ...defaultSettings, ...loadedSettings };
      setMetadata(loadedMetadata);
      setSettings(merged);
      selectLayoutItem(Object.keys(merged.layout ?? {})[0] ?? "");
      if (merged.csv_path) void loadCsv(merged.csv_path, merged);
      if (!merged.ffmpeg_path) {
        void api.discoverFfmpeg().then((result) => {
          if (!result.path) return;
          setSettings((current) => ({ ...current, ffmpeg_path: result.path! }));
          pushLog(t("logs.ffmpegFound", { path: result.path, source: result.source }));
        }).catch(() => undefined);
      }
    });

    return api.onBridgeEvent((event: BridgeEvent) => {
      if (event.type === "log") pushLog(event.message);
      if (event.type === "progress") {
        setProgress(event.total > 0 ? { done: event.done, total: event.total } : null);
      }
    });
  }, []);

  useEffect(() => {
    if (!window.updaterApi) return;
    window.updaterApi.getStatus().then(setUpdateStatus).catch(() => undefined);
    return window.updaterApi.onStatus(setUpdateStatus);
  }, [setUpdateStatus]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__screenshotLoadCsv = loadCsv;
  }, [loadCsv]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__screenshotSelectWidget = selectLayoutItem;
    w.__screenshotUpdateLayout = (id: string, updates: Partial<LayoutItem>) => {
      setSettings((current) => {
        const next = {
          ...current,
          layout: { ...current.layout, [id]: { ...current.layout[id], ...updates } },
        };
        latestSettingsRef.current = next;
        return next;
      });
    };
  }, [latestSettingsRef, selectLayoutItem, setSettings]);
}
