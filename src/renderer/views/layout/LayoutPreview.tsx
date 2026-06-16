import type React from "react";
import { useTranslation } from "react-i18next";
import type { AppSettings, CsvSummary, FrameState, LayoutItem } from "../../../shared/types";
import type { RunningStats } from "../../../shared/widgetDraw";
import { WidgetCanvas } from "../../components/WidgetCanvas";
import { itemName } from "../../utils";
import type { HandleId } from "../../utils";
import type { LayoutEntry, UpdateSetting } from "../layoutTypes";

interface LayoutPreviewProps {
  settings: AppSettings;
  summary: CsvSummary | null;
  previewState: FrameState;
  runningStats: RunningStats;
  previewTime: number;
  selectedItemId: string;
  layoutItems: LayoutEntry[];
  outputWidth: number;
  outputHeight: number;
  previewCursor: string;
  previewZoom: number;
  previewOffset: { x: number; y: number };
  previewStageRef: React.RefObject<HTMLDivElement | null>;
  boundsForPreviewItem: (id: string, item: LayoutItem) => [number, number, number, number];
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  onUpdateSetting: UpdateSetting;
  onTimelineChange: (timeMs: number) => void;
  onTimelineMouseUp: (timeMs: number) => void;
  onStepZoom: (factor: number) => void;
  onResetPreviewView: () => void;
  onGoToSource: () => void;
}

const resizeHandles: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function LayoutPreview(props: LayoutPreviewProps) {
  const { t } = useTranslation();
  const {
    settings, summary, previewState, runningStats, previewTime,
    selectedItemId, layoutItems, outputWidth, outputHeight, previewCursor,
    previewZoom, previewOffset, previewStageRef, boundsForPreviewItem,
    onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onWheel,
    onUpdateSetting, onTimelineChange, onTimelineMouseUp, onStepZoom,
    onResetPreviewView, onGoToSource,
  } = props;
  const durationMs = summary?.duration_ms ?? 0;

  return (
    <div className="preview-workspace">
      <div
        className="preview draggable"
        style={{ cursor: previewCursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
      >
        {summary ? (
          <PreviewStage {...{
            settings, summary, previewState, runningStats, previewTime,
            selectedItemId, layoutItems, outputWidth, outputHeight,
            previewZoom, previewOffset, previewStageRef, boundsForPreviewItem,
          }} />
        ) : (
          <div className="empty">
            {t("layout.noSource")} - <button onClick={onGoToSource}>{t("layout.selectSource")}</button>
          </div>
        )}
      </div>

      <div className="timeline">
        <input
          type="range"
          min={0}
          max={Math.max(1, durationMs)}
          value={Math.min(previewTime, Math.max(1, durationMs))}
          disabled={!summary}
          onChange={(event) => onTimelineChange(Number(event.target.value))}
          onInput={(event) => onTimelineChange(Number(event.currentTarget.value))}
          onMouseUp={(event) => onTimelineMouseUp(Number(event.currentTarget.value))}
          onKeyUp={(event) => onTimelineMouseUp(Number(event.currentTarget.value))}
        />
        <span className="timeline-time">{(previewTime / 1000).toFixed(2)}s</span>
        <div className="timeline-zoom">
          <button className="zoom-btn" title={t("layout.zoomOut")} onClick={() => onStepZoom(1 / 1.25)}>-</button>
          <button className="zoom-btn zoom-pct" title={t("layout.resetZoom")} onClick={onResetPreviewView}>
            {Math.round(previewZoom * 100)}%
          </button>
          <button className="zoom-btn" title={t("layout.zoomIn")} onClick={() => onStepZoom(1.25)}>+</button>
        </div>
        <button
          className="timeline-res"
          title={t("layout.swapDimensions")}
          onClick={() => {
            onUpdateSetting("width", outputHeight);
            onUpdateSetting("height", outputWidth);
            onResetPreviewView();
          }}
        >
          {outputWidth}x{outputHeight}
        </button>
      </div>
    </div>
  );
}

function PreviewStage(props: Pick<LayoutPreviewProps,
  "settings" | "summary" | "previewState" | "runningStats" | "previewTime" |
  "selectedItemId" | "layoutItems" | "outputWidth" | "outputHeight" |
  "previewZoom" | "previewOffset" | "previewStageRef" | "boundsForPreviewItem"
>) {
  const {
    settings, summary, previewState, runningStats, previewTime,
    selectedItemId, layoutItems, outputWidth, outputHeight,
    previewZoom, previewOffset, previewStageRef, boundsForPreviewItem,
  } = props;
  return (
    <div
      ref={previewStageRef}
      className="preview-stage"
      style={{
        "--preview-aspect": `${outputWidth} / ${outputHeight}`,
        transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom})`,
        transformOrigin: "center center",
      } as React.CSSProperties}
    >
      <WidgetCanvas
        layout={settings.layout}
        state={previewState}
        runningStats={runningStats}
        samples={summary?.samples}
        timeMs={previewTime}
        width={outputWidth}
        height={outputHeight}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <div className="editor-chrome-layer">
        {layoutItems.map(([id, item]) => (
          <WidgetChrome
            key={id}
            id={id}
            item={item}
            selected={id === selectedItemId}
            bounds={boundsForPreviewItem(id, item)}
            outputWidth={outputWidth}
            outputHeight={outputHeight}
          />
        ))}
      </div>
    </div>
  );
}

function WidgetChrome(props: {
  id: string;
  item: LayoutItem;
  selected: boolean;
  bounds: [number, number, number, number];
  outputWidth: number;
  outputHeight: number;
}) {
  const { id, item, selected, bounds, outputWidth, outputHeight } = props;
  const [l, t, r, b] = bounds;
  return (
    <div
      className="widget-chrome"
      style={{
        left: `${(l / outputWidth) * 100}%`,
        top: `${(t / outputHeight) * 100}%`,
        width: `${((r - l) / outputWidth) * 100}%`,
        height: `${((b - t) / outputHeight) * 100}%`,
      }}
    >
      <span className="widget-name">{itemName(id, item)}</span>
      <div className={`widget-frame${selected ? " selected" : ""}`} style={{ transform: `rotate(${item.rotation ?? 0}deg)` }}>
        {selected && resizeHandles.map((handle) => <div key={handle} className={`rh rh-${handle}`} />)}
      </div>
    </div>
  );
}
