import { copyFileSync, createWriteStream, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { app } from "electron";
import { makeCanvas, renderFrameToCanvas, getRawFrame } from "./frameRenderer";
import { buildRunningStatsArray, getRunningStatsAt } from "../shared/widgetDraw";
import { BAR_APPEARANCE_DEFAULTS as BAR_DEFAULTS, GRAPH_APPEARANCE_DEFAULTS as GRAPH_DEFAULTS, clamp, interpolateState } from "../shared/util";
import type { CsvSample } from "../shared/types";
import https from "node:https";
import os from "node:os";
import path from "node:path";

type LoadedCsv = {
  samples: CsvSample[];
  sources: string[];
};

type EmitFn = (event: { type: string; [key: string]: unknown }) => void;

const APP_NAME = "MT12OverlayStudio";
const SETTINGS_FILENAME = "overlay_ui_settings.json";
const DEFAULT_SOURCES = ["time", "ch1", "ch2", "ch3", "ch4"];
const TIME_SOURCE = "time";
const CHANNEL_WIDGET_TYPES = ["gauge", "bar", "graph", "text"];
const TIME_WIDGET_TYPES = ["text"];
const LEGACY_VERTICAL_BAR_TO_BAR_SCALE_X = 330 / 220;
const LEGACY_VERTICAL_BAR_TO_BAR_SCALE_Y = 130 / 48;
const BAR_APPEARANCE_DEFAULTS = {
  bar_track_fill_thickness: BAR_DEFAULTS.trackFillThickness,
  bar_track_outline_thickness: BAR_DEFAULTS.trackOutlineThickness,
  bar_center_mark_thickness: BAR_DEFAULTS.centerMarkThickness,
  bar_corner_radius: BAR_DEFAULTS.cornerRadius,
};
const GRAPH_APPEARANCE_DEFAULTS = {
  graph_before_ms: GRAPH_DEFAULTS.beforeMs,
  graph_after_ms: GRAPH_DEFAULTS.afterMs,
  graph_line_thickness: GRAPH_DEFAULTS.lineThickness,
};

function widgetTypesForSource(source: string) {
  return source === TIME_SOURCE ? TIME_WIDGET_TYPES : CHANNEL_WIDGET_TYPES;
}

function defaultItemName(source: string, itemId: string) {
  const prefix = `item_${source}_`;
  if (itemId.startsWith(prefix)) {
    const suffix = itemId.slice(prefix.length);
    if (/^\d+$/.test(suffix)) return `${source} ${suffix}`;
  }
  return source;
}

function defaultItemForSource(source: string, itemId: string) {
  const defaults: Record<string, Record<string, unknown>> = {
    item_time_1: {
      source: "time",
      name: "Timer",
      label: "TIME",
      widget: "text",
      x: 0.13,
      y: 0.07,
      scale_x: 1.15,
      scale_y: 1.08,
      rotation: 0,
      accent_color: "#55beff",
      negative_color: "#55beff",
      positive_color: "#55beff",
      text_color: "#ffffff",
      bg_color: "#141a20",
      bg_visible: true,
      outline_color: "#ffffff",
      outline_visible: true,
      shadow_visible: true,
    },
    item_ch1_1: {
      source: "ch1",
      name: "Steering",
      label: "STEER",
      widget: "gauge",
      x: 0.16,
      y: 0.76,
      scale_x: 1.15,
      scale_y: 1.15,
      rotation: 0,
      accent_color: "#ffd25a",
      negative_color: "#ffaa54",
      positive_color: "#55beff",
      text_color: "#ffffff",
      bg_color: "#141a20",
      bg_visible: true,
      outline_color: "#ffffff",
      outline_visible: true,
      shadow_visible: true,
    },
    item_ch2_1: {
      source: "ch2",
      name: "Throttle / brake",
      label: "THROTTLE",
      widget: "bar",
      x: 0.86,
      y: 0.72,
      scale_x: 1.75,
      scale_y: 2.35,
      rotation: -90,
      accent_color: "#40d68c",
      negative_color: "#ff5c5c",
      positive_color: "#40d68c",
      text_color: "#ffffff",
      bg_color: "#141a20",
      bg_visible: true,
      outline_color: "#ffffff",
      outline_visible: true,
      shadow_visible: true,
      ...BAR_APPEARANCE_DEFAULTS,
    },
    item_ch3_1: {
      source: "ch3",
      name: "Aux 1",
      label: "AUX 1",
      widget: "bar",
      x: 0.74,
      y: 0.08,
      scale_x: 1.65,
      scale_y: 1,
      rotation: 0,
      accent_color: "#55beff",
      negative_color: "#ffaa54",
      positive_color: "#55beff",
      text_color: "#ffffff",
      bg_color: "#141a20",
      bg_visible: true,
      outline_color: "#ffffff",
      outline_visible: true,
      shadow_visible: true,
      ...BAR_APPEARANCE_DEFAULTS,
    },
    item_ch4_1: {
      source: "ch4",
      name: "Aux 2",
      label: "AUX 2",
      widget: "bar",
      x: 0.74,
      y: 0.15,
      scale_x: 1.65,
      scale_y: 1,
      rotation: 0,
      accent_color: "#ffaa54",
      negative_color: "#ffaa54",
      positive_color: "#55beff",
      text_color: "#ffffff",
      bg_color: "#141a20",
      bg_visible: true,
      outline_color: "#ffffff",
      outline_visible: true,
      shadow_visible: true,
      ...BAR_APPEARANCE_DEFAULTS,
    },
  };
  if (defaults[itemId]) return { ...defaults[itemId] };

  const base = {
    source,
    name: defaultItemName(source, itemId),
    label: source,
    widget: widgetTypesForSource(source)[0],
    x: 0.5,
    y: 0.5,
    scale_x: 1,
    scale_y: 1,
    rotation: 0,
    accent_color: "#55beff",
    negative_color: "#ffaa54",
    positive_color: "#55beff",
    text_color: "#ffffff",
    bg_color: "#141a20",
    bg_visible: true,
    outline_color: "#ffffff",
    outline_visible: true,
    shadow_visible: true,
  };
  if (source === "ch2") {
    base.widget = "bar";
    base.scale_x = LEGACY_VERTICAL_BAR_TO_BAR_SCALE_X;
    base.scale_y = LEGACY_VERTICAL_BAR_TO_BAR_SCALE_Y;
    base.rotation = -90;
    base.accent_color = "#40d68c";
    base.negative_color = "#ff5c5c";
    base.positive_color = "#40d68c";
  } else if (source === "ch1") {
    base.widget = "gauge";
    base.accent_color = "#ffd25a";
  } else if (source === TIME_SOURCE) {
    base.widget = "text";
    base.label = "TIME";
    base.negative_color = "#55beff";
    base.positive_color = "#55beff";
  }
  return base.widget === "bar" ? { ...base, ...BAR_APPEARANCE_DEFAULTS } : base;
}

function defaultLayout() {
  return {
    item_time_1: defaultItemForSource("time", "item_time_1"),
    item_ch1_1: defaultItemForSource("ch1", "item_ch1_1"),
    item_ch2_1: defaultItemForSource("ch2", "item_ch2_1"),
    item_ch3_1: defaultItemForSource("ch3", "item_ch3_1"),
    item_ch4_1: defaultItemForSource("ch4", "item_ch4_1"),
  };
}

function sanitizeLayout(layout: unknown) {
  const defaults = defaultLayout();
  if (!layout || typeof layout !== "object") return defaults;
  const raw = layout as Record<string, unknown>;
  const merged: Record<string, Record<string, unknown>> = {};
  const legacyKeys = new Set(DEFAULT_SOURCES);

  for (const [itemId, item] of Object.entries(raw)) {
    if (!item || typeof item !== "object") continue;
    const userItem = item as Record<string, unknown>;
    const source = String(userItem.source || (legacyKeys.has(itemId) ? itemId : "ch1"));
    const normalizedId = legacyKeys.has(itemId) ? `item_${itemId}_1` : itemId;
    const itemDefaults = (defaults as Record<string, Record<string, unknown>>)[normalizedId] || defaultItemForSource(source, normalizedId);
    const rawWidget = String(userItem.widget ?? itemDefaults.widget);
    const legacyVerticalBar = rawWidget === "vertical_bar";
    let widget = legacyVerticalBar ? "bar" : rawWidget;
    if (!widgetTypesForSource(source).includes(widget)) widget = String(itemDefaults.widget);
    const userScaleX = Number(userItem.scale_x ?? (legacyVerticalBar ? 1 : itemDefaults.scale_x));
    const userScaleY = Number(userItem.scale_y ?? (legacyVerticalBar ? 1 : itemDefaults.scale_y));
    const userRotation = Number(userItem.rotation ?? (legacyVerticalBar ? 0 : itemDefaults.rotation ?? 0));
    const sanitizedItem = {
      source,
      name: String(userItem.name ?? itemDefaults.name ?? defaultItemName(source, normalizedId)),
      label: String(userItem.label ?? itemDefaults.label),
      widget,
      x: clamp(Number(userItem.x ?? itemDefaults.x), 0.05, 0.95),
      y: clamp(Number(userItem.y ?? itemDefaults.y), 0.05, 0.95),
      scale_x: clamp(legacyVerticalBar ? userScaleY * LEGACY_VERTICAL_BAR_TO_BAR_SCALE_X : userScaleX, 0.2, 12),
      scale_y: clamp(legacyVerticalBar ? userScaleX * LEGACY_VERTICAL_BAR_TO_BAR_SCALE_Y : userScaleY, 0.2, 12),
      rotation: clamp(legacyVerticalBar ? userRotation - 90 : userRotation, -180, 180),
      accent_color: String(userItem.accent_color ?? itemDefaults.accent_color),
      negative_color: String(userItem.negative_color ?? itemDefaults.negative_color),
      positive_color: String(userItem.positive_color ?? itemDefaults.positive_color),
      text_color: String(userItem.text_color ?? itemDefaults.text_color),
      bg_color: String(userItem.bg_color ?? itemDefaults.bg_color),
      bg_visible: userItem.bg_visible !== undefined ? userItem.bg_visible !== false : itemDefaults.bg_visible !== false,
      outline_color: String(userItem.outline_color ?? itemDefaults.outline_color),
      outline_visible: userItem.outline_visible !== undefined ? userItem.outline_visible !== false : itemDefaults.outline_visible !== false,
      shadow_visible: userItem.shadow_visible !== undefined ? userItem.shadow_visible !== false : itemDefaults.shadow_visible !== false,
      ...(Array.isArray(userItem.transforms) ? { transforms: userItem.transforms as string[] } : {}),
      ...(userItem.range_min !== undefined ? { range_min: Number(userItem.range_min) } : {}),
      ...(userItem.range_center !== undefined ? { range_center: Number(userItem.range_center) } : {}),
      ...(userItem.range_max !== undefined ? { range_max: Number(userItem.range_max) } : {}),
    };
    if (widget === "bar") {
      Object.assign(sanitizedItem, {
        bar_track_fill_thickness: clamp(Number(userItem.bar_track_fill_thickness ?? itemDefaults.bar_track_fill_thickness ?? BAR_APPEARANCE_DEFAULTS.bar_track_fill_thickness), 5, 100),
        bar_track_outline_thickness: clamp(Number(userItem.bar_track_outline_thickness ?? itemDefaults.bar_track_outline_thickness ?? BAR_APPEARANCE_DEFAULTS.bar_track_outline_thickness), 0, 24),
        bar_center_mark_thickness: clamp(Number(userItem.bar_center_mark_thickness ?? itemDefaults.bar_center_mark_thickness ?? BAR_APPEARANCE_DEFAULTS.bar_center_mark_thickness), 0, 24),
        bar_corner_radius: clamp(Number(userItem.bar_corner_radius ?? itemDefaults.bar_corner_radius ?? BAR_APPEARANCE_DEFAULTS.bar_corner_radius), 0, 100),
      });
    }
    if (widget === "graph") {
      Object.assign(sanitizedItem, {
        graph_before_ms: clamp(Number(userItem.graph_before_ms ?? itemDefaults.graph_before_ms ?? GRAPH_APPEARANCE_DEFAULTS.graph_before_ms), 100, 120000),
        graph_after_ms: clamp(Number(userItem.graph_after_ms ?? itemDefaults.graph_after_ms ?? GRAPH_APPEARANCE_DEFAULTS.graph_after_ms), 0, 120000),
        graph_line_thickness: clamp(Number(userItem.graph_line_thickness ?? itemDefaults.graph_line_thickness ?? GRAPH_APPEARANCE_DEFAULTS.graph_line_thickness), 1, 24),
      });
    }
    merged[normalizedId] = sanitizedItem;
  }
  return Object.keys(merged).length ? merged : {};
}

// ─── App data dir ────────────────────────────────────────────────────────────

function appDataDir(): string {
  const candidates: string[] = [];
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, APP_NAME));
  } else if (process.platform === "darwin") {
    candidates.push(path.join(os.homedir(), "Library", "Application Support", APP_NAME));
  } else {
    if (process.env.XDG_CONFIG_HOME) candidates.push(path.join(process.env.XDG_CONFIG_HOME, APP_NAME));
    candidates.push(path.join(os.homedir(), ".config", APP_NAME));
  }
  candidates.push(path.join(os.homedir(), `.${APP_NAME.toLowerCase()}`));
  for (const candidate of candidates) {
    try {
      mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error("Could not create app data directory.");
}

function settingsPath() {
  return path.join(appDataDir(), SETTINGS_FILENAME);
}

// ─── Settings ────────────────────────────────────────────────────────────────

function loadSettings() {
  const file = settingsPath();
  let settings: Record<string, unknown> = {};
  if (existsSync(file)) {
    try {
      settings = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      settings = {};
    }
  }
  settings.layout = sanitizeLayout(settings.layout);
  settings.output_dir ??= path.join(os.tmpdir(), APP_NAME, "overlay_frames");
  settings.video_output ??= path.join("output", "overlay.mov");
  settings.fps ??= 30;
  settings.width ??= 1920;
  settings.height ??= 1080;
  settings.offset_ms ??= 0;
  settings.duration_ms ??= "";
  settings.render_video ??= false;
  settings.ffmpeg_path ??= "";
  settings.settings_path = file;
  return settings;
}

function saveSettings(payload: Record<string, unknown>) {
  const settings = { ...((payload.settings as Record<string, unknown>) || payload) };
  delete settings.settings_path;
  settings.layout = sanitizeLayout(settings.layout);
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
  return loadSettings();
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function csvSources(headers: string[]) {
  return headers.filter((header) => header && header !== "timestamp" && header !== TIME_SOURCE);
}

function loadSamples(csvPath: string, offsetMs = 0): LoadedCsv {
  const content = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("CSV contains no samples.");
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  if (!headers.includes("timestamp")) throw new Error("CSV missing required column: timestamp");
  const sources = csvSources(headers);
  if (!sources.length) throw new Error("CSV contains no telemetry columns.");
  const index = Object.fromEntries(headers.map((header, idx) => [header, idx]));
  let firstTick: number | null = null;

  const samples: CsvSample[] = [];
  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    const tick = Number(row[index.timestamp]);
    if (!Number.isFinite(tick)) continue;
    firstTick ??= tick;
    const values: Record<string, number> = {};
    for (const source of sources) {
      const value = Number(row[index[source]]);
      if (Number.isFinite(value)) values[source] = value;
    }
    samples.push({
      time_ms: (tick - firstTick) * 10 + offsetMs,
      values,
    });
  }
  if (!samples.length) throw new Error("CSV contains no samples.");
  return { samples, sources };
}

function loadCsvSummary(payload: Record<string, unknown>) {
  const csvPath = String(payload.csv_path || "");
  const { samples, sources } = loadSamples(csvPath, Number(payload.offset_ms || 0));
  return {
    csv_path: csvPath,
    sample_count: samples.length,
    duration_ms: Math.max(0, samples[samples.length - 1].time_ms),
    samples,
    sources: [TIME_SOURCE, ...sources],
  };
}

function previewState(payload: Record<string, unknown>) {
  const { samples } = loadSamples(String(payload.csv_path || ""), Number(payload.offset_ms || 0));
  return {
    time_ms: Number(payload.time_ms || 0),
    state: interpolateState(samples, Number(payload.time_ms || 0)),
  };
}

// ─── Radio discovery ─────────────────────────────────────────────────────────

function driveRoots() {
  if (process.platform !== "win32") return [];
  const roots: string[] = [];
  for (let code = 65; code <= 90; code += 1) {
    const root = `${String.fromCharCode(code)}:\\`;
    if (existsSync(root)) roots.push(root);
  }
  return roots;
}

function looksLikeEdgeTx(root: string) {
  const logs = path.join(root, "LOGS");
  const scripts = path.join(root, "SCRIPTS");
  if (!existsSync(logs) || !existsSync(scripts)) return false;
  return ["TOOLS", "TELEMETRY", "MIXES", "WIZARD"].some((marker) => existsSync(path.join(scripts, marker)));
}

function discoverRadios() {
  const sources = driveRoots()
    .filter(looksLikeEdgeTx)
    .map((root) => ({
      drive: root.replace(/\\$/, ""),
      root,
      logs_dir: path.join(root, "LOGS"),
      display_name: `${root.replace(/\\$/, "")} (EdgeTX SD)`,
    }));
  return { sources };
}

function humanizeLog(filePath: string) {
  const parsed = path.parse(filePath);
  const match = parsed.name.match(/^(\d{8})_(\d{6})_(.+)$/);
  if (!match) {
    return { path: filePath, display_name: parsed.base, model_name: null, timestamp_text: null };
  }
  const [, ymd, hms, rawModel] = match;
  const timestamp = `${ymd.slice(0, 4)}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)} ${hms.slice(0, 2)}:${hms.slice(2, 4)}:${hms.slice(4, 6)}`;
  const model = rawModel.replace(/_/g, " ").trim();
  return { path: filePath, display_name: `${model} ${timestamp}`, model_name: model, timestamp_text: timestamp };
}

function listRadioLogs(payload: Record<string, unknown>) {
  const root = String(payload.root || "");
  const logsDir = path.join(root, "LOGS");
  if (!existsSync(logsDir)) return { logs: [] };
  const logs = readdirSync(logsDir)
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .map((name) => path.join(logsDir, name))
    .filter((filePath) => statSync(filePath).isFile())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    .map(humanizeLog);
  return { logs };
}

// ─── Script installer ─────────────────────────────────────────────────────────

function luaScriptsSrcDir(): string {
  // In packaged builds the Lua files live in extraResources, outside the asar.
  if (app.isPackaged) return path.join(process.resourcesPath, "edgetx", "sdcard", "SCRIPTS");
  return path.join(app.getAppPath(), "edgetx", "sdcard", "SCRIPTS");
}

const LUA_FILES: { src: string; dest: string }[] = [
  { src: path.join("RCLOG", "RCLOGC.lua"),    dest: path.join("SCRIPTS", "RCLOG", "RCLOGC.lua")    },
  { src: path.join("TELEMETRY", "RCLOG.lua"), dest: path.join("SCRIPTS", "TELEMETRY", "RCLOG.lua") },
  { src: path.join("TOOLS", "RCLOG.lua"),     dest: path.join("SCRIPTS", "TOOLS", "RCLOG.lua")     },
];

function installScripts(payload: Record<string, unknown>) {
  const sdRoot = String(payload.root || "");
  if (!sdRoot) throw new Error("No SD card root specified.");

  const srcBase = luaScriptsSrcDir();
  const installed: string[] = [];

  for (const { src, dest } of LUA_FILES) {
    const srcPath = path.join(srcBase, src);
    if (!existsSync(srcPath)) throw new Error(`Script not found in app bundle: ${src}`);
    const destPath = path.join(sdRoot, dest);
    mkdirSync(path.dirname(destPath), { recursive: true });
    copyFileSync(srcPath, destPath);
    installed.push(dest);
  }

  return { installed };
}

// ─── Widget helpers ───────────────────────────────────────────────────────────

function nextItemId(layout: Record<string, unknown>, source: string) {
  const prefix = `item_${source}_`;
  let highest = 0;
  for (const key of Object.keys(layout)) {
    if (key.startsWith(prefix)) {
      const value = Number(key.slice(prefix.length));
      if (Number.isInteger(value)) highest = Math.max(highest, value);
    }
  }
  return `${prefix}${highest + 1}`;
}

function createWidget(payload: Record<string, unknown>) {
  const layout = sanitizeLayout(payload.layout);
  const source = String(payload.source || "ch1");
  const item_id = nextItemId(layout, source);
  return { item_id, item: defaultItemForSource(source, item_id) };
}

// ─── ffmpeg auto-discovery ────────────────────────────────────────────────────

function ffmpegInstallDir() {
  return path.join(appDataDir(), "ffmpeg");
}

function ffmpegBinaryName() {
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function discoverFfmpeg(): { path: string | null; source: string } {
  // 1. Previously downloaded by this app
  const installed = path.join(ffmpegInstallDir(), ffmpegBinaryName());
  if (existsSync(installed)) return { path: installed, source: "installed" };

  // 2. System PATH
  try {
    const cmd = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    const found = execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim().split("\n")[0].trim();
    if (found && existsSync(found)) return { path: found, source: "PATH" };
  } catch {
    /* not on PATH */
  }

  // 3. Common install locations
  const candidates: string[] = [];
  if (process.platform === "win32") {
    candidates.push(
      "C:\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
      path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
      path.join(process.env.ProgramData ?? "", "chocolatey", "bin", "ffmpeg.exe"),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/usr/local/bin/ffmpeg",
      "/opt/homebrew/bin/ffmpeg",
      "/opt/local/bin/ffmpeg",
    );
  } else {
    candidates.push("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/snap/bin/ffmpeg");
  }

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return { path: candidate, source: "common location" };
  }

  return { path: null, source: "not found" };
}

// ─── ffmpeg download ──────────────────────────────────────────────────────────

function platformFfmpegKey(): string {
  const { platform, arch } = process;
  if (platform === "win32") return "windows-64";
  if (platform === "darwin") return arch === "arm64" ? "osx-arm-64" : "osx-64";
  if (platform === "linux") return arch === "arm64" ? "linux-arm64" : "linux-64";
  throw new Error(`Unsupported platform: ${platform}/${arch}`);
}

function httpsGetText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(httpsGetText(res.headers.location));
        return;
      }
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
  });
}

function downloadFileWithProgress(
  url: string,
  dest: string,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (attemptUrl: string) => {
      const file = createWriteStream(dest);
      const req = https.get(attemptUrl, { timeout: 120000 }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          attempt(res.headers.location);
          return;
        }
        const total = parseInt(res.headers["content-length"] ?? "0", 10);
        let done = 0;
        res.on("data", (chunk: Buffer) => {
          done += chunk.length;
          if (total > 0) onProgress(done, total);
        });
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        res.on("error", (err) => { file.close(); reject(err); });
        file.on("error", (err) => { file.close(); reject(err); });
      });
      req.on("error", (err) => { file.close(); reject(err); });
    };
    attempt(url);
  });
}

function extractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let cmd: string;
    let args: string[];
    if (process.platform === "win32") {
      cmd = "powershell.exe";
      args = [
        "-NonInteractive",
        "-Command",
        `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${destDir}" -Force`,
      ];
    } else {
      cmd = "unzip";
      args = ["-o", zipPath, "-d", destDir];
    }
    const proc = spawn(cmd, args, { stdio: "pipe" });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Extraction failed (exit code ${String(code)})`));
    });
    proc.on("error", reject);
  });
}

async function downloadFfmpeg(emit: EmitFn): Promise<{ path: string }> {
  const platformKey = platformFfmpegKey();
  emit({ type: "log", message: `Fetching ffmpeg release info for ${platformKey}...` });

  const apiText = await httpsGetText("https://ffbinaries.com/api/v1/version/latest");
  const apiData = JSON.parse(apiText) as Record<string, unknown>;
  const bin = apiData.bin as Record<string, Record<string, string>> | undefined;
  const downloadUrl = bin?.[platformKey]?.ffmpeg;
  if (!downloadUrl) throw new Error(`No ffmpeg binary available for platform: ${platformKey}`);

  const version = String(apiData.version ?? "unknown");
  emit({ type: "log", message: `Downloading ffmpeg ${version}...` });

  const tempDir = path.join(os.tmpdir(), APP_NAME, "ffmpeg_dl");
  mkdirSync(tempDir, { recursive: true });
  const zipName = path.basename(new URL(downloadUrl).pathname);
  const zipPath = path.join(tempDir, zipName);

  await downloadFileWithProgress(downloadUrl, zipPath, (done, total) => {
    emit({ type: "progress", done, total });
  });

  emit({ type: "log", message: "Extracting ffmpeg..." });
  const installDir = ffmpegInstallDir();
  mkdirSync(installDir, { recursive: true });
  await extractZip(zipPath, installDir);

  const binaryPath = path.join(installDir, ffmpegBinaryName());
  if (!existsSync(binaryPath)) throw new Error("ffmpeg binary not found after extraction");

  if (process.platform !== "win32") {
    chmodSync(binaryPath, 0o755);
  }

  emit({ type: "log", message: `ffmpeg ready: ${binaryPath}` });
  emit({ type: "progress", done: 0, total: 0 }); // clear progress bar

  return { path: binaryPath };
}

// ─── Render overlay ───────────────────────────────────────────────────────────

async function renderOverlay(payload: Record<string, unknown>, emit: EmitFn) {
  const csvPath = String(payload.csv_path || "");
  if (!csvPath) throw new Error("No CSV file specified.");

  const outputDir = String(payload.output_dir || path.join(os.tmpdir(), APP_NAME, "overlay_frames"));
  const videoOutput = String(payload.video_output || path.join(outputDir, "..", "overlay.mov"));
  const fps = clamp(Number(payload.fps) || 30, 1, 60);
  const width = Math.max(1, Number(payload.width) || 1920);
  const height = Math.max(1, Number(payload.height) || 1080);
  const offsetMs = Number(payload.offset_ms) || 0;
  const durationMs = Number(payload.duration_ms) || 0;
  const renderVideo = Boolean(payload.render_video);
  const ffmpegPath = String(payload.ffmpeg_path || "");
  const layout = sanitizeLayout(payload.layout);

  const { samples } = loadSamples(csvPath, offsetMs);
  const runningStatsArray = buildRunningStatsArray(samples);
  const lastMs = samples[samples.length - 1].time_ms;
  const totalMs = durationMs > 0 ? Math.min(durationMs, lastMs) : lastMs;
  const frameCount = Math.max(1, Math.ceil((totalMs / 1000) * fps));
  const msPerFrame = 1000 / fps;

  emit({ type: "log", message: `Rendering ${frameCount} frames at ${fps}fps · ${(totalMs / 1000).toFixed(1)}s · ${width}×${height}` });

  const canvas = makeCanvas(width, height);

  if (renderVideo) {
    if (!ffmpegPath) throw new Error("ffmpeg not configured. Use Auto-detect or Download in Settings.");
    if (!existsSync(ffmpegPath)) throw new Error(`ffmpeg not found: ${ffmpegPath}`);

    mkdirSync(path.dirname(videoOutput), { recursive: true });

    // Pipe raw RGBA frames into ffmpeg — no PNG compression overhead.
    const proc = spawn(ffmpegPath, [
      "-y",
      "-f", "rawvideo", "-pixel_format", "rgba",
      "-video_size", `${width}x${height}`, "-framerate", String(fps),
      "-i", "pipe:0",
      "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
      "-vendor", "apl0", "-an",
      videoOutput,
    ], { stdio: ["pipe", "ignore", "pipe"] });

    const procDone = new Promise<void>((resolve, reject) => {
      proc.stderr?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) emit({ type: "log", message: msg });
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${String(code)}`));
      });
    });

    const stdin = proc.stdin!;
    try {
      let lastProgressAt = 0;
      for (let i = 0; i < frameCount; i++) {
        const timeMs = i * msPerFrame;
        const state = interpolateState(samples, timeMs);
        const runningStats = getRunningStatsAt(runningStatsArray, samples, timeMs);
        renderFrameToCanvas(canvas, layout, state, runningStats, timeMs, width, height, samples);
        const raw = getRawFrame(canvas);
        if (!stdin.write(raw)) {
          await new Promise<void>((res, rej) => {
            const onDrain = () => { stdin.off("error", onError); res(); };
            const onError = (e: Error) => { stdin.off("drain", onDrain); rej(e); };
            stdin.once("drain", onDrain);
            stdin.once("error", onError);
          });
        }
        const now = Date.now();
        if (now - lastProgressAt >= 100 || i === frameCount - 1) {
          emit({ type: "progress", done: i + 1, total: frameCount });
          lastProgressAt = now;
        }
      }
      stdin.end();
    } catch (err) {
      stdin.destroy();
      proc.kill();
      throw err;
    }

    await procDone;
    emit({ type: "log", message: `MOV exported: ${videoOutput}` });
    emit({ type: "progress", done: 0, total: 0 });
    return { frame_count: frameCount, output_dir: "", video_output: videoOutput };
  }

  // PNG frames mode — native canvas, write to disk.
  mkdirSync(outputDir, { recursive: true });
  try {
    for (const f of readdirSync(outputDir).filter((n) => n.startsWith("frame_") && n.endsWith(".png"))) {
      rmSync(path.join(outputDir, f));
    }
  } catch { /* ignore */ }

  let lastProgressAt = 0;
  for (let i = 0; i < frameCount; i++) {
    const timeMs = i * msPerFrame;
    const state = interpolateState(samples, timeMs);
    const runningStats = getRunningStatsAt(runningStatsArray, samples, timeMs);
    renderFrameToCanvas(canvas, layout, state, runningStats, timeMs, width, height, samples);
    const png = await canvas.encode("png");
    writeFileSync(path.join(outputDir, `frame_${String(i).padStart(6, "0")}.png`), png);
    const now = Date.now();
    if (now - lastProgressAt >= 100 || i === frameCount - 1) {
      emit({ type: "progress", done: i + 1, total: frameCount });
      lastProgressAt = now;
    }
  }

  emit({ type: "log", message: `Done — ${frameCount} PNG frames saved to: ${outputDir}` });
  emit({ type: "progress", done: 0, total: 0 });
  return { frame_count: frameCount, output_dir: outputDir, video_output: "" };
}

// ─── Command registry ─────────────────────────────────────────────────────────

const commands: Record<string, (payload: Record<string, unknown>, emit: EmitFn) => unknown> = {
  metadata: () => ({ sources: DEFAULT_SOURCES, channel_widget_types: CHANNEL_WIDGET_TYPES, time_widget_types: TIME_WIDGET_TYPES }),
  default_layout: () => ({ layout: defaultLayout() }),
  load_settings: () => loadSettings(),
  save_settings: (payload) => saveSettings(payload),
  discover_radios: () => discoverRadios(),
  list_radio_logs: (payload) => listRadioLogs(payload),
  load_csv_summary: (payload) => loadCsvSummary(payload),
  preview_state: (payload) => previewState(payload),
  create_widget: (payload) => createWidget(payload),
  discover_ffmpeg: () => discoverFfmpeg(),
  download_ffmpeg: (_payload, emit) => downloadFfmpeg(emit),
  install_scripts: (payload) => installScripts(payload),
  render_overlay: (payload, emit) => renderOverlay(payload, emit),
};

export function handleNativeCommand(
  command: string,
  payload: Record<string, unknown> = {},
  emit: EmitFn = () => undefined,
) {
  const handler = commands[command];
  if (!handler) throw new Error(`Unknown command: ${command}`);
  return handler(payload, emit);
}
