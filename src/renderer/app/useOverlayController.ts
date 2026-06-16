import type { TFunction } from "i18next";
import { useAppLifecycle } from "./useAppLifecycle";
import { useAppState } from "./useAppState";
import { useCsvActions } from "./useCsvActions";
import { useExportActions } from "./useExportActions";
import { useLayoutCommands } from "./useLayoutCommands";
import { usePreviewInteraction } from "./usePreviewInteraction";
import { useRadioInstallActions } from "./useRadioInstallActions";

export function useOverlayController(t: TFunction) {
  const state = useAppState();
  const pushLog = (message: string) => {
    state.setLogs((current) => [message, ...current].slice(0, 200));
  };

  const layout = useLayoutCommands(state);
  const csv = useCsvActions(state, t, pushLog);
  const radioInstall = useRadioInstallActions(state, t, pushLog);
  const exporter = useExportActions(state, t, pushLog, layout.updateSetting);
  const preview = usePreviewInteraction(
    state,
    layout.selectLayoutItem,
    layout.moveWidget,
    layout.rememberLayoutUndo,
  );

  useAppLifecycle(state, t, pushLog, csv.loadCsv, layout.selectLayoutItem);

  return {
    ...state,
    ...layout,
    ...csv,
    ...radioInstall,
    ...exporter,
    ...preview,
  };
}
