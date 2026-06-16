import type React from "react";
import type { AppState } from "./useAppState";

export function usePreviewViewport(state: AppState) {
  const { previewZoom, setPreviewZoom, setPreviewOffset } = state;

  function handlePreviewWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(0.15, Math.min(8, previewZoom * factor));
    const zoomRatio = newZoom / previewZoom;
    const rect = event.currentTarget.getBoundingClientRect();
    const mx = event.clientX - (rect.left + rect.width / 2);
    const my = event.clientY - (rect.top + rect.height / 2);
    setPreviewZoom(newZoom);
    setPreviewOffset((offset) => ({
      x: mx + (offset.x - mx) * zoomRatio,
      y: my + (offset.y - my) * zoomRatio,
    }));
  }

  function resetPreviewView() {
    setPreviewZoom(1);
    setPreviewOffset({ x: 0, y: 0 });
  }

  function stepZoom(factor: number) {
    setPreviewZoom((zoom) => {
      const newZoom = Math.max(0.15, Math.min(8, zoom * factor));
      const zoomRatio = newZoom / zoom;
      setPreviewOffset((offset) => ({ x: offset.x * zoomRatio, y: offset.y * zoomRatio }));
      return newZoom;
    });
  }

  return { handlePreviewWheel, resetPreviewView, stepZoom };
}
