import { useTranslation } from "react-i18next";
import { SourceView } from "../views/SourceView";
import { LayoutView } from "../views/LayoutView";
import { ExportView } from "../views/ExportView";
import { InstallView } from "../views/InstallView";
import { AppTopbar } from "./AppTopbar";
import { useOverlayController } from "./useOverlayController";

export function OverlayApp() {
  const { t, i18n } = useTranslation();
  const app = useOverlayController(t);

  const changeLanguage = (lang: string) => {
    void i18n.changeLanguage(lang);
    localStorage.setItem("mt12-language", lang);
  };

  return (
    <main className="shell">
      <AppTopbar
        t={t}
        language={i18n.language}
        summary={app.summary}
        currentView={app.currentView}
        updateStatus={app.updateStatus}
        onChangeLanguage={changeLanguage}
        onSetCurrentView={app.setCurrentView}
        onSaveSettings={() => void app.saveSettings()}
      />

      {app.currentView === "source" && (
        <SourceView
          settings={app.settings}
          summary={app.summary}
          busy={app.busy}
          inputMode={app.inputMode}
          radios={app.radios}
          radioLogs={app.radioLogs}
          selectedRadioRoot={app.selectedRadioRoot}
          selectedRadioLog={app.selectedRadioLog}
          onSetInputMode={app.setInputMode}
          onChooseCsv={() => void app.chooseCsv()}
          onUpdateCsvPath={(path) => app.updateSetting("csv_path", path)}
          onLoadCsv={(path) => void app.loadCsv(path, app.settings)}
          onDiscoverRadios={() => void app.discoverRadios()}
          onSelectRadioSource={(root) => void app.selectRadioSource(root)}
          onSetSelectedRadioLog={app.setSelectedRadioLog}
          onApplyRadioLog={(path) => void app.applyRadioLog(path)}
          onGoToLayout={() => app.setCurrentView("layout")}
        />
      )}

      {app.currentView === "layout" && (
        <LayoutView
          settings={app.settings}
          metadata={app.metadata}
          summary={app.summary}
          previewState={app.previewState}
          runningStats={app.runningStats}
          previewTime={app.previewTime}
          selectedItemId={app.selectedItemId}
          selectedItem={app.selectedItem}
          layoutItems={app.layoutItems}
          outputWidth={app.outputWidth}
          outputHeight={app.outputHeight}
          previewCursor={app.previewCursor}
          previewZoom={app.previewZoom}
          previewOffset={app.previewOffset}
          previewStageRef={app.previewStageRef}
          boundsForPreviewItem={app.boundsForPreviewItem}
          onPointerDown={app.handlePreviewPointerDown}
          onPointerMove={app.handlePreviewPointerMove}
          onPointerUp={app.handlePreviewPointerUp}
          onPointerLeave={() => app.setPreviewCursor("default")}
          onWheel={app.handlePreviewWheel}
          onSetSelectedItemId={app.selectLayoutItem}
          onAddWidget={() => void app.addWidget()}
          onDuplicateWidget={() => void app.duplicateWidget()}
          onDeleteWidget={app.deleteWidget}
          onResetLayout={app.resetLayout}
          onChangeSelectedSource={app.changeSelectedSource}
          onUpdateSelectedItem={app.updateSelectedItem}
          onUpdateSelectedNumber={app.updateSelectedNumber}
          onUpdateSetting={app.updateSetting}
          onTimelineChange={(n) => { app.setPreviewTime(n); app.schedulePreviewAt(n); }}
          onTimelineMouseUp={(n) => void app.refreshPreview(app.settings.csv_path, n)}
          onStepZoom={app.stepZoom}
          onResetPreviewView={app.resetPreviewView}
          onGoToSource={() => app.setCurrentView("source")}
        />
      )}

      {app.currentView === "export" && (
        <ExportView
          settings={app.settings}
          busy={app.busy}
          ffmpegReady={app.ffmpegReady}
          ffmpegDownloading={app.ffmpegDownloading}
          progress={app.progress}
          logs={app.logs}
          onUpdateSetting={app.updateSetting}
          onChooseMovOutput={() => void app.chooseMovOutput()}
          onAutoDetectFfmpeg={() => void app.autoDetectFfmpeg()}
          onDownloadFfmpeg={() => void app.handleDownloadFfmpeg()}
          onChooseFfmpeg={() => void app.chooseFfmpeg()}
          onRenderOverlay={() => void app.renderOverlay()}
        />
      )}

      {app.currentView === "install" && (
        <InstallView
          busy={app.busy}
          installMode={app.installMode}
          installDir={app.installDir}
          installResult={app.installResult}
          radios={app.radios}
          selectedRadioRoot={app.selectedRadioRoot}
          onSetInstallMode={(mode) => { app.setInstallMode(mode); app.setInstallResult([]); }}
          onDiscoverRadios={() => void app.discoverRadios()}
          onSetSelectedRadioRoot={app.setSelectedRadioRoot}
          onPickInstallDir={() => void app.pickInstallDir()}
          onRunInstall={(root) => void app.runInstall(root)}
        />
      )}
    </main>
  );
}
