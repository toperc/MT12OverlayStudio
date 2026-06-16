import type { TFunction } from "i18next";
import { api } from "../utils";
import type { AppState } from "./useAppState";

export function useRadioInstallActions(
  state: AppState,
  t: TFunction,
  pushLog: (message: string) => void,
) {
  const {
    setBusy, setInstallDir, setInstallResult, setRadios,
    setRadioLogs, setSelectedRadioRoot, setSelectedRadioLog,
  } = state;

  async function discoverRadios() {
    try {
      const result = await api.discoverRadios();
      setRadios(result.sources);
      pushLog(result.sources.length
        ? t("logs.foundRadios", { count: result.sources.length })
        : t("logs.noEdgeTx"));
      if (result.sources[0]) await selectRadioSource(result.sources[0].root);
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    }
  }

  async function selectRadioSource(root: string) {
    setSelectedRadioRoot(root);
    setSelectedRadioLog("");
    const result = await api.listRadioLogs(root);
    setRadioLogs(result.logs);
  }

  async function runInstall(root: string) {
    if (!root) return;
    setBusy(true);
    setInstallResult([]);
    try {
      const result = await api.installScripts(root);
      setInstallResult(result.installed);
    } catch (error) {
      setInstallResult([error instanceof Error ? error.message : String(error)]);
    } finally {
      setBusy(false);
    }
  }

  async function pickInstallDir() {
    const dir = await api.chooseDirectory();
    if (dir) setInstallDir(dir);
  }

  return { discoverRadios, selectRadioSource, runInstall, pickInstallDir };
}
