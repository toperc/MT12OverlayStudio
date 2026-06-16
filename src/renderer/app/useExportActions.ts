import type { TFunction } from "i18next";
import type { AppSettings } from "../../shared/types";
import { api } from "../utils";
import type { AppState } from "./useAppState";

export function useExportActions(
  state: AppState,
  t: TFunction,
  pushLog: (message: string) => void,
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void,
) {
  const {
    settings, setSettings, setBusy, setFfmpegDownloading, setProgress,
  } = state;

  async function autoDetectFfmpeg() {
    try {
      const result = await api.discoverFfmpeg();
      if (result.path) {
        updateSetting("ffmpeg_path", result.path);
        pushLog(t("logs.ffmpegFound", { path: result.path, source: result.source }));
      } else {
        pushLog(t("logs.ffmpegNotFound"));
      }
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDownloadFfmpeg() {
    setFfmpegDownloading(true);
    try {
      const result = await api.downloadFfmpeg();
      updateSetting("ffmpeg_path", result.path);
      pushLog(t("logs.ffmpegDownloaded"));
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    } finally {
      setFfmpegDownloading(false);
      setProgress(null);
    }
  }

  async function renderOverlay() {
    if (!settings.csv_path) return;
    setBusy(true);
    setProgress(null);
    try {
      const saved = await api.saveSettings(settings);
      setSettings((current) => ({ ...current, ...saved }));
      const result = await api.renderOverlay(saved as Record<string, unknown>);
      pushLog(t("logs.rendered", { count: result.frame_count }));
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    try {
      const saved = await api.saveSettings(settings);
      setSettings((current) => ({ ...current, settings_path: saved.settings_path }));
      pushLog(saved.settings_path
        ? t("logs.settingsSavedPath", { path: saved.settings_path })
        : t("logs.settingsSaved"));
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    }
  }

  async function chooseMovOutput() {
    const path = await api.chooseMovOutput();
    if (path) updateSetting("video_output", path);
  }

  async function chooseFfmpeg() {
    const path = await api.chooseFfmpeg();
    if (path) updateSetting("ffmpeg_path", path);
  }

  return {
    autoDetectFfmpeg,
    handleDownloadFfmpeg,
    renderOverlay,
    saveSettings,
    chooseMovOutput,
    chooseFfmpeg,
  };
}
