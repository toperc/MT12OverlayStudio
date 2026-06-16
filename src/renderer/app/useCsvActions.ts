import type { TFunction } from "i18next";
import type { AppSettings, CsvSample } from "../../shared/types";
import { interpolateState } from "../../shared/util";
import { buildRunningStatsArray } from "../../shared/widgetDraw";
import { api } from "../utils";
import type { AppState } from "./useAppState";

export function useCsvActions(
  state: AppState,
  t: TFunction,
  pushLog: (message: string) => void,
) {
  const {
    settings, setSettings, previewSamples, setPreviewSamples,
    setBusy, setMetadata, setPreviewState, setPreviewTime,
    setRunningStatsArray, setSummary, setInputMode, setSelectedRadioLog,
    selectedRadioLog, previewTime, previewRequestRef, previewScheduleRef,
    pendingPreviewTimeRef, latestSettingsRef,
  } = state;

  async function chooseCsv() {
    const path = await api.chooseCsv();
    if (!path) return;
    const next = { ...settings, csv_path: path };
    setInputMode("manual");
    setSettings(next);
    await loadCsv(path, next);
  }

  async function loadCsv(path = settings.csv_path, sourceSettings = settings) {
    if (!path) return;
    setBusy(true);
    try {
      const loaded = await api.loadCsvSummary({
        csv_path: path,
        offset_ms: sourceSettings.offset_ms,
      });
      const loadedSamples = loaded.samples || [];
      setSummary(loaded);
      setPreviewSamples(loadedSamples);
      setRunningStatsArray(buildRunningStatsArray(loadedSamples));
      setMetadata((current) => ({
        ...current,
        sources: loaded.sources.length ? loaded.sources : current.sources,
      }));
      const midPoint = loaded.duration_ms / 2;
      setPreviewTime(midPoint);
      updatePreviewFromSamples(loadedSamples, midPoint);
      pushLog(t("logs.loadedSamples", { count: loaded.sample_count }));
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function refreshPreview(path = settings.csv_path, timeMs = previewTime, sourceSettings = settings) {
    if (!path) return;
    if (previewSamples.length) {
      setPreviewState(interpolateState(previewSamples, timeMs));
      return;
    }
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    try {
      const result = await api.previewState({
        csv_path: path,
        offset_ms: sourceSettings.offset_ms,
        time_ms: timeMs,
      });
      if (requestId === previewRequestRef.current) setPreviewState(result.state);
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    }
  }

  function schedulePreviewAt(timeMs: number) {
    pendingPreviewTimeRef.current = timeMs;
    if (previewScheduleRef.current !== null) return;
    previewScheduleRef.current = window.requestAnimationFrame(() => {
      previewScheduleRef.current = null;
      updatePreviewFromSamples(previewSamples, pendingPreviewTimeRef.current);
    });
  }

  function updatePreviewFromSamples(samples: CsvSample[], timeMs: number) {
    if (!samples.length) {
      void refreshPreview(settings.csv_path, timeMs, latestSettingsRef.current);
      return;
    }
    setPreviewState(interpolateState(samples, timeMs));
  }

  async function applyRadioLog(path = selectedRadioLog) {
    if (!path) return;
    const next: AppSettings = { ...settings, csv_path: path };
    setInputMode("radio");
    setSelectedRadioLog(path);
    setSettings(next);
    await loadCsv(path, next);
  }

  return { chooseCsv, loadCsv, refreshPreview, schedulePreviewAt, applyRadioLog };
}
