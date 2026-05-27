import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import {
  Download,
  RefreshCcw,
  Save,
  Youtube,
} from "lucide-react";
import type {
  AppMetadata,
  AppSettings,
  BridgeEvent,
  CsvSample,
  CsvSummary,
  FrameState,
  LayoutItem,
  RadioLog,
  RadioSource,
  UpdateStatus,
} from "../shared/types";
import "./styles.css";
import "./i18n";
import {
  api,
  defaultSettings,
  fallbackMetadata,
} from "./utils";
import type { HandleId, ResizePreview, ResizingState } from "./utils";
import {
  clamp,
  interpolateState,
  itemBounds,
  numeric,
  widgetSize,
  widgetTypesForSource,
} from "../shared/util";
import { buildRunningStatsArray, getRunningStatsAt, type RunningStats } from "../shared/widgetDraw";
import { CaptureRenderer } from "./components/CaptureRenderer";
import { LangDropdown } from "./components/LangDropdown";
import { SourceView } from "./views/SourceView";
import { LayoutView } from "./views/LayoutView";
import { ExportView } from "./views/ExportView";
import { InstallView } from "./views/InstallView";

function App() {
  const { t, i18n } = useTranslation();

  if (new URLSearchParams(window.location.search).get("capture") === "1") {
    return <CaptureRenderer />;
  }

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
  const [inputMode, setInputMode] = useState<"manual" | "radio">("manual");
  const [currentView, setCurrentView] = useState<"source" | "layout" | "export" | "install">("source");
  const [installMode, setInstallMode] = useState<"manual" | "auto">("auto");
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

  const layoutItems = useMemo(() => Object.entries(settings.layout ?? {}), [settings.layout]);
  const selectedItem = selectedItemId ? settings.layout[selectedItemId] : undefined;
  const runningStats: RunningStats = useMemo(
    () => getRunningStatsAt(runningStatsArray, previewSamples, previewTime),
    [runningStatsArray, previewSamples, previewTime],
  );
  const ffmpegReady = Boolean(String(settings.ffmpeg_path ?? "").trim());
  const outputWidth = Math.max(1, numeric(settings.width, 1920));
  const outputHeight = Math.max(1, numeric(settings.height, 1080));

  useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);

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
      const firstId = Object.keys(merged.layout ?? {})[0];
      setSelectedItemId(firstId ?? "");
      if (merged.csv_path) {
        void loadCsv(merged.csv_path, merged);
      }
      if (!merged.ffmpeg_path) {
        void api.discoverFfmpeg().then((result) => {
          if (result.path) {
            setSettings((current) => ({ ...current, ffmpeg_path: result.path! }));
            pushLog(t("logs.ffmpegFound", { path: result.path, source: result.source }));
          }
        }).catch(() => undefined);
      }
    });

    return api.onBridgeEvent((event: BridgeEvent) => {
      if (event.type === "log") pushLog(event.message);
      if (event.type === "progress") setProgress(event.total > 0 ? { done: event.done, total: event.total } : null);
    });
  }, []);

  useEffect(() => {
    if (!window.updaterApi) return;
    window.updaterApi.getStatus().then(setUpdateStatus).catch(() => undefined);
    return window.updaterApi.onStatus(setUpdateStatus);
  }, []);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__screenshotLoadCsv = loadCsv;
  }, [loadCsv]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__screenshotSelectWidget = setSelectedItemId;
    w.__screenshotUpdateLayout = (id: string, updates: Partial<LayoutItem>) => {
      setSettings((current) => ({
        ...current,
        layout: { ...current.layout, [id]: { ...current.layout[id], ...updates } },
      }));
    };
  }, []);

  function pushLog(message: string) {
    setLogs((current) => [message, ...current].slice(0, 200));
  }

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateSelectedItem<K extends keyof LayoutItem>(key: K, value: LayoutItem[K]) {
    if (!selectedItemId) return;
    setSettings((current) => ({
      ...current,
      layout: {
        ...current.layout,
        [selectedItemId]: { ...current.layout[selectedItemId], [key]: value },
      },
    }));
  }

  function updateSelectedNumber(key: keyof LayoutItem, value: string, low: number, high: number) {
    updateSelectedItem(key, clamp(Number(value), low, high) as never);
  }

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
      setSummary(loaded);
      const loadedSamples = loaded.samples || [];
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
      if (requestId !== previewRequestRef.current) return;
      setPreviewState(result.state);
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
      pushLog(saved.settings_path ? t("logs.settingsSavedPath", { path: saved.settings_path }) : t("logs.settingsSaved"));
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
    }
  }

  async function discoverRadios() {
    try {
      const result = await api.discoverRadios();
      setRadios(result.sources);
      pushLog(result.sources.length ? t("logs.foundRadios", { count: result.sources.length }) : t("logs.noEdgeTx"));
      if (result.sources[0]) {
        await selectRadioSource(result.sources[0].root);
      }
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

  async function applyRadioLog(path = selectedRadioLog) {
    if (!path) return;
    const next = { ...settings, csv_path: path };
    setInputMode("radio");
    setSettings(next);
    await loadCsv(path, next);
  }

  async function addWidget() {
    const source = selectedItem?.source ?? metadata.sources.find((item) => item !== "time") ?? "ch1";
    const result = await api.createWidget({ source, layout: settings.layout });
    setSettings((current) => ({
      ...current,
      layout: { ...current.layout, [result.item_id]: result.item },
    }));
    setSelectedItemId(result.item_id);
  }

  async function duplicateWidget() {
    if (!selectedItemId || !selectedItem) return;
    const result = await api.createWidget({ source: selectedItem.source, layout: settings.layout });
    const copy = {
      ...result.item,
      ...selectedItem,
      name: `${selectedItem.name || selectedItem.label || selectedItem.source} Copy`,
      x: clamp(selectedItem.x + 0.04, 0.05, 0.95),
      y: clamp(selectedItem.y + 0.04, 0.05, 0.95),
    };
    setSettings((current) => ({
      ...current,
      layout: { ...current.layout, [result.item_id]: copy },
    }));
    setSelectedItemId(result.item_id);
  }

  function deleteWidget() {
    if (!selectedItemId) return;
    setSettings((current) => {
      const nextLayout = { ...current.layout };
      delete nextLayout[selectedItemId];
      const nextId = Object.keys(nextLayout)[0] ?? "";
      setSelectedItemId(nextId);
      return { ...current, layout: nextLayout };
    });
  }

  function resetLayout() {
    void api.defaultLayout().then((loaded) => {
      const nextLayout = loaded.layout;
      setSettings((current) => ({ ...current, layout: nextLayout }));
      setSelectedItemId(Object.keys(nextLayout)[0] ?? "");
    });
  }

  function changeSelectedSource(source: string) {
    if (!selectedItem) return;
    const allowed = widgetTypesForSource(metadata, source);
    updateSelectedItem("source", source);
    if (!allowed.includes(selectedItem.widget)) updateSelectedItem("widget", allowed[0]);
  }

  function previewPointerToFrame(event: React.PointerEvent<HTMLElement>) {
    const stage = previewStageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = clamp(((event.clientX - rect.left) / rect.width) * outputWidth, 0, outputWidth);
    const y = clamp(((event.clientY - rect.top) / rect.height) * outputHeight, 0, outputHeight);
    return { x, y, frameWidth: outputWidth, frameHeight: outputHeight };
  }

  function rotatedPoint(x: number, y: number, cx: number, cy: number, degrees: number) {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = x - cx;
    const dy = y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  function rotateOffset(x: number, y: number, degrees: number) {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  }

  function pointInItemBounds(x: number, y: number, item: LayoutItem, bounds: [number, number, number, number]) {
    const [left, top, right, bottom] = bounds;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const local = rotatedPoint(x, y, cx, cy, -(item.rotation ?? 0));
    return left <= local.x && local.x <= right && top <= local.y && local.y <= bottom;
  }

  function resizeHandlePoints(item: LayoutItem, bounds: [number, number, number, number]): [HandleId, number, number][] {
    const [l, t, r, b] = bounds;
    const mx = (l + r) / 2;
    const my = (t + b) / 2;
    const rotation = item.rotation ?? 0;
    const point = (id: HandleId, x: number, y: number): [HandleId, number, number] => {
      const rotated = rotatedPoint(x, y, mx, my, rotation);
      return [id, rotated.x, rotated.y];
    };
    return [
      point("nw", l, t), point("n", mx, t), point("ne", r, t),
      point("w",  l, my),                 point("e",  r, my),
      point("sw", l, b), point("s", mx, b), point("se", r, b),
    ];
  }

  function resizeCursor(handle: HandleId, rotation = 0) {
    const baseAxis: Record<HandleId, number> = {
      e: 0, w: 0,
      n: 90, s: 90,
      nw: 45, se: 45,
      ne: 135, sw: 135,
    };
    const axis = ((baseAxis[handle] + rotation) % 180 + 180) % 180;
    if (axis < 22.5 || axis >= 157.5) return "ew-resize";
    if (axis < 67.5) return "nwse-resize";
    if (axis < 112.5) return "ns-resize";
    return "nesw-resize";
  }

  function locateItemAt(x: number, y: number) {
    for (const [id, item] of [...layoutItems].reverse()) {
      const [left, top, right, bottom] = itemBounds(item, outputWidth, outputHeight);
      const bounds = [left, top, right, bottom] as [number, number, number, number];
      if (pointInItemBounds(x, y, item, bounds)) return { id, bounds };
    }
    return null;
  }

  function moveWidget(itemId: string, x: number, y: number) {
    if (!itemId) return;
    setSettings((current) => {
      if (!current.layout[itemId]) return current;
      const next = {
        ...current,
        layout: {
          ...current.layout,
          [itemId]: { ...current.layout[itemId], x, y },
        },
      };
      latestSettingsRef.current = next;
      return next;
    });
  }

  function scheduleDragPreview(itemId: string, x: number, y: number) {
    dragPreviewRef.current = { itemId, x, y };
    if (dragRafRef.current !== null) return;
    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = null;
      setDragPreview(dragPreviewRef.current);
    });
  }

  function boundsForPreviewItem(id: string, item: LayoutItem) {
    if (resizePreview?.itemId === id) {
      return itemBounds(
        { ...item, x: resizePreview.x, y: resizePreview.y, scale_x: resizePreview.scaleX, scale_y: resizePreview.scaleY },
        outputWidth, outputHeight,
      );
    }
    const bounds = itemBounds(item, outputWidth, outputHeight);
    if (!dragPreview || dragPreview.itemId !== id) return bounds;
    const [left, top, right, bottom] = bounds;
    const width = right - left;
    const height = bottom - top;
    const centerX = dragPreview.x * outputWidth;
    const centerY = dragPreview.y * outputHeight;
    const nextLeft = clamp(centerX - width / 2, 0, Math.max(0, outputWidth - width));
    const nextTop = clamp(centerY - height / 2, 0, Math.max(0, outputHeight - height));
    return [nextLeft, nextTop, nextLeft + width, nextTop + height] as [number, number, number, number];
  }

  function scheduleResizePreview(preview: ResizePreview) {
    resizePreviewRef.current = preview;
    if (resizeRafRef.current !== null) return;
    resizeRafRef.current = window.requestAnimationFrame(() => {
      resizeRafRef.current = null;
      setResizePreview(resizePreviewRef.current);
    });
  }

  function locateResizeHandle(frameX: number, frameY: number): HandleId | null {
    if (!selectedItemId || !previewStageRef.current) return null;
    const item = settings.layout[selectedItemId];
    if (!item) return null;
    const bounds = boundsForPreviewItem(selectedItemId, item);
    const stageRect = previewStageRef.current.getBoundingClientRect();
    const hit = 10 * (outputWidth / (stageRect.width / previewZoom));

    for (const [id, hx, hy] of resizeHandlePoints(item, bounds)) {
      if (Math.hypot(frameX - hx, frameY - hy) <= hit) return id;
    }
    return null;
  }

  function handlePreviewWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(0.15, Math.min(8, previewZoom * factor));
    const zRatio = newZoom / previewZoom;
    const rect = event.currentTarget.getBoundingClientRect();
    const mx = event.clientX - (rect.left + rect.width / 2);
    const my = event.clientY - (rect.top + rect.height / 2);
    setPreviewZoom(newZoom);
    setPreviewOffset((o) => ({ x: mx + (o.x - mx) * zRatio, y: my + (o.y - my) * zRatio }));
  }

  function resetPreviewView() {
    setPreviewZoom(1);
    setPreviewOffset({ x: 0, y: 0 });
  }

  function stepZoom(factor: number) {
    setPreviewZoom((z) => {
      const newZ = Math.max(0.15, Math.min(8, z * factor));
      const zRatio = newZ / z;
      setPreviewOffset((o) => ({ x: o.x * zRatio, y: o.y * zRatio }));
      return newZ;
    });
  }

  function handlePreviewPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const point = previewPointerToFrame(event);

    const handle = point ? locateResizeHandle(point.x, point.y) : null;
    if (handle && point && selectedItemId) {
      const item = settings.layout[selectedItemId];
      if (item) {
        const [l, t, r, b] = boundsForPreviewItem(selectedItemId, item);
        const width = r - l;
        const height = b - t;
        resizingRef.current = {
          itemId: selectedItemId,
          handle,
          fixedLocalX: (handle === "n" || handle === "s") ? null : handle.includes("w") ? width / 2 : -width / 2,
          fixedLocalY: (handle === "e" || handle === "w") ? null : handle.includes("n") ? height / 2 : -height / 2,
          origCenterX: (l + r) / 2,
          origCenterY: (t + b) / 2,
          origWidth: width,
          origHeight: height,
          origScaleX: item.scale_x, origScaleY: item.scale_y,
          rotation: item.rotation ?? 0,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
    }

    const found = summary && layoutItems.length && point ? locateItemAt(point.x, point.y) : null;
    if (found && point) {
      const [l, t, r, b] = found.bounds;
      const cx = (l + r) / 2;
      const cy = (t + b) / 2;
      draggingItemRef.current = { itemId: found.id, dx: point.x - cx, dy: point.y - cy };
      scheduleDragPreview(found.id, cx / point.frameWidth, cy / point.frameHeight);
      setSelectedItemId(found.id);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    panStartRef.current = { cx: event.clientX, cy: event.clientY, ox: previewOffset.x, oy: previewOffset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePreviewPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (resizingRef.current) {
      const point = previewPointerToFrame(event);
      if (!point) return;
      const {
        itemId,
        handle,
        fixedLocalX,
        fixedLocalY,
        origCenterX,
        origCenterY,
        origWidth,
        origHeight,
        origScaleX,
        origScaleY,
        rotation,
      } = resizingRef.current;
      const item = settings.layout[itemId];
      if (!item) return;
      const [baseW, baseH] = widgetSize(item.widget);
      const sc = Math.max(0.01, Math.min(outputWidth / 1920, outputHeight / 1080));
      const MIN_W = 32, MIN_H = 24;

      const localPointer = rotatedPoint(point.x, point.y, origCenterX, origCenterY, -rotation);
      let movingLocalX = localPointer.x - origCenterX;
      let movingLocalY = localPointer.y - origCenterY;
      let nextWidth = origWidth;
      let nextHeight = origHeight;
      let centerLocalX = 0;
      let centerLocalY = 0;

      const resizingX = fixedLocalX !== null;
      const resizingY = fixedLocalY !== null;
      const isCornerResize = handle.length === 2 && resizingX && resizingY;

      if (isCornerResize && fixedLocalX !== null && fixedLocalY !== null) {
        const rawWidth = Math.abs(movingLocalX - fixedLocalX);
        const rawHeight = Math.abs(movingLocalY - fixedLocalY);
        const minFactor = Math.max(0.2 / origScaleX, 0.2 / origScaleY, MIN_W / origWidth, MIN_H / origHeight);
        const maxFactor = Math.min(12 / origScaleX, 12 / origScaleY);
        const factor = clamp(Math.max(rawWidth / origWidth, rawHeight / origHeight), minFactor, maxFactor);
        nextWidth = origWidth * factor;
        nextHeight = origHeight * factor;
        movingLocalX = fixedLocalX + (handle.includes("w") ? -nextWidth : nextWidth);
        movingLocalY = fixedLocalY + (handle.includes("n") ? -nextHeight : nextHeight);
        centerLocalX = (fixedLocalX + movingLocalX) / 2;
        centerLocalY = (fixedLocalY + movingLocalY) / 2;
      } else {
        if (fixedLocalX !== null) {
          nextWidth = clamp(Math.abs(movingLocalX - fixedLocalX), MIN_W, baseW * sc * 12);
          movingLocalX = fixedLocalX + (handle.includes("w") ? -nextWidth : nextWidth);
          centerLocalX = (fixedLocalX + movingLocalX) / 2;
        }

        if (fixedLocalY !== null) {
          nextHeight = clamp(Math.abs(movingLocalY - fixedLocalY), MIN_H, baseH * sc * 12);
          movingLocalY = fixedLocalY + (handle.includes("n") ? -nextHeight : nextHeight);
          centerLocalY = (fixedLocalY + movingLocalY) / 2;
        }
      }

      const centerOffset = rotateOffset(centerLocalX, centerLocalY, rotation);
      const newX = clamp((origCenterX + centerOffset.x) / outputWidth, 0.01, 0.99);
      const newY = clamp((origCenterY + centerOffset.y) / outputHeight, 0.01, 0.99);
      const newScaleX = clamp(nextWidth / (baseW * sc), 0.2, 12);
      const newScaleY = clamp(nextHeight / (baseH * sc), 0.2, 12);

      scheduleResizePreview({ itemId, x: newX, y: newY, scaleX: newScaleX, scaleY: newScaleY });
      return;
    }

    if (panStartRef.current) {
      setPreviewOffset({
        x: panStartRef.current.ox + event.clientX - panStartRef.current.cx,
        y: panStartRef.current.oy + event.clientY - panStartRef.current.cy,
      });
      return;
    }

    if (draggingItemRef.current) {
      const point = previewPointerToFrame(event);
      if (!point) return;
      const cx = clamp(point.x - draggingItemRef.current.dx, 0, point.frameWidth);
      const cy = clamp(point.y - draggingItemRef.current.dy, 0, point.frameHeight);
      scheduleDragPreview(
        draggingItemRef.current.itemId,
        clamp(cx / point.frameWidth, 0.05, 0.95),
        clamp(cy / point.frameHeight, 0.05, 0.95),
      );
      return;
    }

    const point = previewPointerToFrame(event);
    if (point) {
      const handle = locateResizeHandle(point.x, point.y);
      if (handle) {
        const item = selectedItemId ? settings.layout[selectedItemId] : undefined;
        setPreviewCursor(resizeCursor(handle, item?.rotation ?? 0));
        return;
      }
      const found = summary && layoutItems.length ? locateItemAt(point.x, point.y) : null;
      setPreviewCursor(found ? "grab" : "default");
    }
  }

  function handlePreviewPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const release = () => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    if (resizingRef.current) {
      const r = resizePreviewRef.current;
      if (r) {
        setSettings((current) => ({
          ...current,
          layout: {
            ...current.layout,
            [r.itemId]: { ...current.layout[r.itemId], x: r.x, y: r.y, scale_x: r.scaleX, scale_y: r.scaleY },
          },
        }));
      }
      setResizePreview(null);
      resizingRef.current = null;
      resizePreviewRef.current = null;
      release();
      return;
    }

    if (panStartRef.current) {
      panStartRef.current = null;
      release();
      return;
    }

    if (draggingItemRef.current) {
      const committed = dragPreviewRef.current;
      if (committed) moveWidget(committed.itemId, committed.x, committed.y);
      draggingItemRef.current = null;
      dragPreviewRef.current = null;
      setDragPreview(null);
      release();
    }
  }

  return (
    <main className="shell">

      <header className="topbar">
        <div className="topbar-brand">
          <h1>{t("appTitle")}</h1>
          {summary && (
            <p>{summary.sample_count.toLocaleString()} {t("topbar.samplesUnit")} · {(summary.duration_ms / 1000).toFixed(1)} s</p>
          )}
        </div>

        <nav className="view-nav">
          <button
            className={`nav-step${currentView === "install" ? " active" : ""}`}
            onClick={() => setCurrentView("install")}
          >
            <span className="step-badge">⬇</span> {t("nav.install")}
          </button>
          <button
            className={`nav-step${currentView === "source" ? " active" : ""}`}
            onClick={() => setCurrentView("source")}
          >
            <span className="step-badge">1</span> {t("nav.source")}
          </button>
          <button
            className={`nav-step${currentView === "layout" ? " active" : ""}`}
            onClick={() => setCurrentView("layout")}
          >
            <span className="step-badge">2</span> {t("nav.layout")}
          </button>
          <button
            className={`nav-step${currentView === "export" ? " active" : ""}`}
            onClick={() => setCurrentView("export")}
          >
            <span className="step-badge">3</span> {t("nav.export")}
          </button>
        </nav>

        <div className="actions">
          {updateStatus.status === "available" && (
            <button className="update-chip update-chip-available" onClick={() => window.updaterApi?.download()}>
              <Download size={15} /> v{"version" in updateStatus ? updateStatus.version : ""} {t("topbar.available")}
            </button>
          )}
          {updateStatus.status === "downloading" && (
            <span className="update-chip update-chip-downloading">
              <Download size={15} /> {"percent" in updateStatus ? updateStatus.percent : 0}%
            </span>
          )}
          {updateStatus.status === "ready" && (
            <button className="update-chip update-chip-ready" onClick={() => window.updaterApi?.quitAndInstall()}>
              <RefreshCcw size={15} /> {t("topbar.restartToUpdate")}
            </button>
          )}
          <a
            className="yt-pill"
            href="https://www.youtube.com/@TopeRC-es"
            target="_blank"
            rel="noreferrer"
          >
            <Youtube size={15} />
            TopeRC
          </a>
          <LangDropdown
            value={i18n.language}
            onChange={(lang) => {
              i18n.changeLanguage(lang);
              localStorage.setItem("mt12-language", lang);
            }}
          />
          <button onClick={saveSettings}>
            <Save size={17} /> {t("topbar.save")}
          </button>
        </div>
      </header>

      {currentView === "source" && (
        <SourceView
          settings={settings}
          summary={summary}
          busy={busy}
          inputMode={inputMode}
          radios={radios}
          radioLogs={radioLogs}
          selectedRadioRoot={selectedRadioRoot}
          selectedRadioLog={selectedRadioLog}
          onSetInputMode={setInputMode}
          onChooseCsv={() => void chooseCsv()}
          onUpdateCsvPath={(path) => updateSetting("csv_path", path)}
          onLoadCsv={(path) => void loadCsv(path, settings)}
          onDiscoverRadios={() => void discoverRadios()}
          onSelectRadioSource={(root) => void selectRadioSource(root)}
          onSetSelectedRadioLog={setSelectedRadioLog}
          onApplyRadioLog={(path) => void applyRadioLog(path)}
          onGoToLayout={() => setCurrentView("layout")}
        />
      )}

      {currentView === "layout" && (
        <LayoutView
          settings={settings}
          metadata={metadata}
          summary={summary}
          previewState={previewState}
          runningStats={runningStats}
          previewTime={previewTime}
          selectedItemId={selectedItemId}
          selectedItem={selectedItem}
          layoutItems={layoutItems}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
          previewCursor={previewCursor}
          previewZoom={previewZoom}
          previewOffset={previewOffset}
          previewStageRef={previewStageRef}
          boundsForPreviewItem={boundsForPreviewItem}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={handlePreviewPointerUp}
          onPointerLeave={() => setPreviewCursor("default")}
          onWheel={handlePreviewWheel}
          onSetSelectedItemId={setSelectedItemId}
          onAddWidget={() => void addWidget()}
          onDuplicateWidget={() => void duplicateWidget()}
          onDeleteWidget={deleteWidget}
          onResetLayout={resetLayout}
          onChangeSelectedSource={changeSelectedSource}
          onUpdateSelectedItem={updateSelectedItem}
          onUpdateSelectedNumber={updateSelectedNumber}
          onUpdateSetting={updateSetting}
          onTimelineChange={(n) => { setPreviewTime(n); schedulePreviewAt(n); }}
          onTimelineMouseUp={(n) => void refreshPreview(settings.csv_path, n)}
          onStepZoom={stepZoom}
          onResetPreviewView={resetPreviewView}
          onGoToSource={() => setCurrentView("source")}
        />
      )}

      {currentView === "export" && (
        <ExportView
          settings={settings}
          busy={busy}
          ffmpegReady={ffmpegReady}
          ffmpegDownloading={ffmpegDownloading}
          progress={progress}
          logs={logs}
          onUpdateSetting={updateSetting}
          onChooseMovOutput={async () => { const p = await api.chooseMovOutput(); if (p) updateSetting("video_output", p); }}
          onAutoDetectFfmpeg={() => void autoDetectFfmpeg()}
          onDownloadFfmpeg={() => void handleDownloadFfmpeg()}
          onChooseFfmpeg={async () => { const p = await api.chooseFfmpeg(); if (p) updateSetting("ffmpeg_path", p); }}
          onRenderOverlay={() => void renderOverlay()}
        />
      )}

      {currentView === "install" && (
        <InstallView
          busy={busy}
          installMode={installMode}
          installDir={installDir}
          installResult={installResult}
          radios={radios}
          selectedRadioRoot={selectedRadioRoot}
          onSetInstallMode={(mode) => { setInstallMode(mode); setInstallResult([]); }}
          onDiscoverRadios={() => void discoverRadios()}
          onSetSelectedRadioRoot={setSelectedRadioRoot}
          onPickInstallDir={() => void pickInstallDir()}
          onRunInstall={(root) => void runInstall(root)}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
