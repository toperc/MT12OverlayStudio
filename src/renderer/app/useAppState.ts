import { useMemo, useRef, useState } from "react";
import type {
  AppMetadata,
  AppSettings,
  CsvSample,
  CsvSummary,
  FrameState,
  LayoutItem,
  RadioLog,
  RadioSource,
  UpdateStatus,
} from "../../shared/types";
import { numeric } from "../../shared/util";
import { getRunningStatsAt, type RunningStats } from "../../shared/widgetDraw";
import { defaultSettings, fallbackMetadata } from "../utils";
import type { ResizePreview, ResizingState } from "../utils";
import type { CurrentView, InputMode, InstallMode, LayoutSnapshot } from "./types";

export function useAppState() {
  const [metadata, setMetadata] = useState<AppMetadata>(fallbackMetadata);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [summary, setSummary] = useState<CsvSummary | null>(null);
  const [previewSamples, setPreviewSamples] = useState<CsvSample[]>([]);
  const [runningStatsArray, setRunningStatsArray] = useState<RunningStats[]>([]);
  const [previewState, setPreviewState] = useState<FrameState>({});
  const [previewTime, setPreviewTime] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [radios, setRadios] = useState<RadioSource[]>([]);
  const [radioLogs, setRadioLogs] = useState<RadioLog[]>([]);
  const [selectedRadioRoot, setSelectedRadioRoot] = useState("");
  const [selectedRadioLog, setSelectedRadioLog] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [currentView, setCurrentView] = useState<CurrentView>("source");
  const [installMode, setInstallMode] = useState<InstallMode>("auto");
  const [installDir, setInstallDir] = useState("");
  const [installResult, setInstallResult] = useState<string[]>([]);
  const [dragPreview, setDragPreview] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);
  const [previewCursor, setPreviewCursor] = useState("default");
  const [ffmpegDownloading, setFfmpegDownloading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: "idle" });
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });

  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const draggingItemRef = useRef<{ itemId: string; dx: number; dy: number } | null>(null);
  const dragPreviewRef = useRef<{ itemId: string; x: number; y: number } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const resizingRef = useRef<ResizingState | null>(null);
  const resizePreviewRef = useRef<ResizePreview | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const panStartRef = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);
  const previewRequestRef = useRef(0);
  const previewScheduleRef = useRef<number | null>(null);
  const pendingPreviewTimeRef = useRef(0);
  const latestSettingsRef = useRef<AppSettings>(defaultSettings);
  const selectedItemIdRef = useRef("");
  const layoutUndoStackRef = useRef<LayoutSnapshot[]>([]);
  const widgetClipboardRef = useRef<LayoutItem | null>(null);

  const layoutItems = useMemo(() => Object.entries(settings.layout ?? {}), [settings.layout]);
  const selectedItem = selectedItemId ? settings.layout[selectedItemId] : undefined;
  const runningStats = useMemo(
    () => getRunningStatsAt(runningStatsArray, previewSamples, previewTime),
    [runningStatsArray, previewSamples, previewTime],
  );
  const ffmpegReady = Boolean(String(settings.ffmpeg_path ?? "").trim());
  const outputWidth = Math.max(1, numeric(settings.width, 1920));
  const outputHeight = Math.max(1, numeric(settings.height, 1080));

  return {
    metadata, setMetadata, settings, setSettings, summary, setSummary,
    previewSamples, setPreviewSamples, runningStatsArray, setRunningStatsArray,
    previewState, setPreviewState, previewTime, setPreviewTime,
    logs, setLogs, busy, setBusy, progress, setProgress,
    radios, setRadios, radioLogs, setRadioLogs,
    selectedRadioRoot, setSelectedRadioRoot, selectedRadioLog, setSelectedRadioLog,
    selectedItemId, setSelectedItemId, inputMode, setInputMode,
    currentView, setCurrentView, installMode, setInstallMode,
    installDir, setInstallDir, installResult, setInstallResult,
    dragPreview, setDragPreview, resizePreview, setResizePreview,
    previewCursor, setPreviewCursor, ffmpegDownloading, setFfmpegDownloading,
    updateStatus, setUpdateStatus, previewZoom, setPreviewZoom,
    previewOffset, setPreviewOffset, previewStageRef, draggingItemRef,
    dragPreviewRef, dragRafRef, resizingRef, resizePreviewRef,
    resizeRafRef, panStartRef, previewRequestRef, previewScheduleRef,
    pendingPreviewTimeRef, latestSettingsRef, selectedItemIdRef,
    layoutUndoStackRef, widgetClipboardRef, layoutItems, selectedItem,
    runningStats, ffmpegReady, outputWidth, outputHeight,
  };
}

export type AppState = ReturnType<typeof useAppState>;
