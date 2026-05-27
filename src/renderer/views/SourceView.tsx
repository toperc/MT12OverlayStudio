import { useTranslation } from "react-i18next";
import {
  Antenna,
  ArrowRight,
  FolderOpen,
  RefreshCcw,
} from "lucide-react";
import type { AppSettings, CsvSummary, RadioLog, RadioSource } from "../../shared/types";
import { SupportCard } from "../components/SupportCard";

export interface SourceViewProps {
  settings: AppSettings;
  summary: CsvSummary | null;
  busy: boolean;
  inputMode: "manual" | "radio";
  radios: RadioSource[];
  radioLogs: RadioLog[];
  selectedRadioRoot: string;
  selectedRadioLog: string;
  onSetInputMode: (mode: "manual" | "radio") => void;
  onChooseCsv: () => void;
  onUpdateCsvPath: (path: string) => void;
  onLoadCsv: (path: string) => void;
  onDiscoverRadios: () => void;
  onSelectRadioSource: (root: string) => void;
  onSetSelectedRadioLog: (path: string) => void;
  onApplyRadioLog: (path: string) => void;
  onGoToLayout: () => void;
}

export function SourceView(props: SourceViewProps) {
  const { t } = useTranslation();
  const {
    settings,
    summary,
    busy,
    inputMode,
    radios,
    radioLogs,
    selectedRadioRoot,
    selectedRadioLog,
    onSetInputMode,
    onChooseCsv,
    onUpdateCsvPath,
    onLoadCsv,
    onDiscoverRadios,
    onSelectRadioSource,
    onSetSelectedRadioLog,
    onApplyRadioLog,
    onGoToLayout,
  } = props;

  return (
    <div className="view-body source-view">
      <div className="source-card source-card-active install-card">

        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn${inputMode === "manual" ? " active" : ""}`}
            onClick={() => onSetInputMode("manual")}
          >
            <FolderOpen size={14} /> {t("source.manualCsvTitle")}
          </button>
          <button
            className={`mode-toggle-btn${inputMode === "radio" ? " active" : ""}`}
            onClick={() => onSetInputMode("radio")}
          >
            <Antenna size={14} /> {t("source.mt12AutoTitle")}
          </button>
        </div>

        <p className="install-mode-desc">
          {inputMode === "manual" ? t("source.manualDesc") : t("source.radioDesc")}
        </p>

        {inputMode === "manual" && (<>
          <button
            className="wide"
            onClick={onChooseCsv}
            disabled={busy}
          >
            <FolderOpen size={17} /> {busy ? t("source.loading") : t("source.browseCsv")}
          </button>
          <input
            className="path"
            value={settings.csv_path ?? ""}
            placeholder={t("source.csvPathPlaceholder")}
            onChange={(e) => onUpdateCsvPath(e.target.value)}
            onBlur={() => {
              if (settings.csv_path && settings.csv_path !== summary?.csv_path)
                onLoadCsv(settings.csv_path);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && settings.csv_path) {
                onLoadCsv(settings.csv_path);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </>)}

        {inputMode === "radio" && (<>
          <button
            className="wide"
            onClick={onDiscoverRadios}
            disabled={busy}
          >
            <RefreshCcw size={17} /> {t("source.scanForUnits")}
          </button>
          <label className="field">
            <span>{t("source.radioUnit")}</span>
            <select value={selectedRadioRoot} onChange={(e) => onSelectRadioSource(e.target.value)}>
              <option value="">{t("source.noUnitFound")}</option>
              {radios.map((r) => (
                <option key={r.root} value={r.root}>{r.display_name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("source.logFile")}</span>
            <select
              value={selectedRadioLog}
              onChange={(e) => { onSetSelectedRadioLog(e.target.value); onApplyRadioLog(e.target.value); }}
            >
              <option value="">{t("source.noLogSelected")}</option>
              {radioLogs.map((l) => (
                <option key={l.path} value={l.path}>{l.display_name}</option>
              ))}
            </select>
          </label>
        </>)}

      </div>

      {summary && (
        <div className="source-loaded">
          <div className="summary-bar">
            <span className="summary-chip">{summary.sample_count.toLocaleString()} samples</span>
            <span className="summary-chip">{(summary.duration_ms / 1000).toFixed(2)} s</span>
            <span className="summary-chip summary-chip-path">
              {settings.csv_path?.split(/[\\/]/).pop()}
            </span>
          </div>

          <button className="primary source-continue" onClick={onGoToLayout}>
            {t("source.editLayout")} <ArrowRight size={16} />
          </button>
        </div>
      )}

      <SupportCard />
    </div>
  );
}
