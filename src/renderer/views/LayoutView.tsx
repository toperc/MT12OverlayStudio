import type React from "react";
import type {
  AppMetadata,
  AppSettings,
  CsvSummary,
  FrameState,
  LayoutItem,
} from "../../shared/types";
import type { RunningStats } from "../../shared/widgetDraw";
import { LayoutInspector } from "./layout/LayoutInspector";
import { LayoutPreview } from "./layout/LayoutPreview";

export interface LayoutViewProps {
  settings: AppSettings;
  metadata: AppMetadata;
  summary: CsvSummary | null;
  previewState: FrameState;
  runningStats: RunningStats;
  previewTime: number;
  selectedItemId: string;
  selectedItem: LayoutItem | undefined;
  layoutItems: [string, LayoutItem][];
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
  onSetSelectedItemId: (id: string) => void;
  onAddWidget: () => void;
  onDuplicateWidget: () => void;
  onDeleteWidget: () => void;
  onResetLayout: () => void;
  onChangeSelectedSource: (source: string) => void;
  onUpdateSelectedItem: <K extends keyof LayoutItem>(key: K, value: LayoutItem[K]) => void;
  onUpdateSelectedNumber: (key: keyof LayoutItem, value: string, low: number, high: number) => void;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onTimelineChange: (timeMs: number) => void;
  onTimelineMouseUp: (timeMs: number) => void;
  onStepZoom: (factor: number) => void;
  onResetPreviewView: () => void;
  onGoToSource: () => void;
}

export function LayoutView(props: LayoutViewProps) {
  return (
    <div className="view-body layout-view">
      <LayoutPreview
        settings={props.settings}
        summary={props.summary}
        previewState={props.previewState}
        runningStats={props.runningStats}
        previewTime={props.previewTime}
        selectedItemId={props.selectedItemId}
        layoutItems={props.layoutItems}
        outputWidth={props.outputWidth}
        outputHeight={props.outputHeight}
        previewCursor={props.previewCursor}
        previewZoom={props.previewZoom}
        previewOffset={props.previewOffset}
        previewStageRef={props.previewStageRef}
        boundsForPreviewItem={props.boundsForPreviewItem}
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
        onPointerLeave={props.onPointerLeave}
        onWheel={props.onWheel}
        onUpdateSetting={props.onUpdateSetting}
        onTimelineChange={props.onTimelineChange}
        onTimelineMouseUp={props.onTimelineMouseUp}
        onStepZoom={props.onStepZoom}
        onResetPreviewView={props.onResetPreviewView}
        onGoToSource={props.onGoToSource}
      />
      <LayoutInspector
        metadata={props.metadata}
        selectedItemId={props.selectedItemId}
        selectedItem={props.selectedItem}
        layoutItems={props.layoutItems}
        outputWidth={props.outputWidth}
        outputHeight={props.outputHeight}
        onSetSelectedItemId={props.onSetSelectedItemId}
        onAddWidget={props.onAddWidget}
        onDuplicateWidget={props.onDuplicateWidget}
        onDeleteWidget={props.onDeleteWidget}
        onResetLayout={props.onResetLayout}
        onChangeSelectedSource={props.onChangeSelectedSource}
        onUpdateSelectedItem={props.onUpdateSelectedItem}
        onUpdateSelectedNumber={props.onUpdateSelectedNumber}
      />
    </div>
  );
}
