import { Download, RefreshCcw, Save, Youtube } from "lucide-react";
import type { TFunction } from "i18next";
import type { CsvSummary, UpdateStatus } from "../../shared/types";
import { LangDropdown } from "../components/LangDropdown";
import type { CurrentView } from "./types";

interface AppTopbarProps {
  t: TFunction;
  language: string;
  summary: CsvSummary | null;
  currentView: CurrentView;
  updateStatus: UpdateStatus;
  onChangeLanguage: (language: string) => void;
  onSetCurrentView: (view: CurrentView) => void;
  onSaveSettings: () => void;
}

const navItems: { view: CurrentView; badge: string; label: string }[] = [
  { view: "install", badge: "⬇", label: "nav.install" },
  { view: "source", badge: "1", label: "nav.source" },
  { view: "layout", badge: "2", label: "nav.layout" },
  { view: "export", badge: "3", label: "nav.export" },
];

export function AppTopbar(props: AppTopbarProps) {
  const {
    t, language, summary, currentView, updateStatus,
    onChangeLanguage, onSetCurrentView, onSaveSettings,
  } = props;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <h1>{t("appTitle")}</h1>
        {summary && (
          <p>
            {summary.sample_count.toLocaleString()} {t("topbar.samplesUnit")} ·{" "}
            {(summary.duration_ms / 1000).toFixed(1)} s
          </p>
        )}
      </div>

      <nav className="view-nav">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`nav-step${currentView === item.view ? " active" : ""}`}
            onClick={() => onSetCurrentView(item.view)}
          >
            <span className="step-badge">{item.badge}</span> {t(item.label)}
          </button>
        ))}
      </nav>

      <div className="actions">
        {updateStatus.status === "available" && (
          <button className="update-chip update-chip-available" onClick={() => window.updaterApi?.download()}>
            <Download size={15} /> v{updateStatus.version} {t("topbar.available")}
          </button>
        )}
        {updateStatus.status === "downloading" && (
          <span className="update-chip update-chip-downloading">
            <Download size={15} /> {updateStatus.percent}%
          </span>
        )}
        {updateStatus.status === "ready" && (
          <button className="update-chip update-chip-ready" onClick={() => window.updaterApi?.quitAndInstall()}>
            <RefreshCcw size={15} /> {t("topbar.restartToUpdate")}
          </button>
        )}
        <a className="yt-pill" href="https://www.youtube.com/@TopeRC-es" target="_blank" rel="noreferrer">
          <Youtube size={15} />
          TopeRC
        </a>
        <LangDropdown value={language} onChange={onChangeLanguage} />
        <button onClick={onSaveSettings}>
          <Save size={17} /> {t("topbar.save")}
        </button>
      </div>
    </header>
  );
}
