import { useTranslation } from "react-i18next";
import type { LayoutItem } from "../../../shared/types";
import { clamp, GRAPH_APPEARANCE_DEFAULTS } from "../../../shared/util";
import type { UpdateSelectedItem } from "../layoutTypes";
import { NumberControl } from "./InspectorControls";

interface GraphWindowSectionProps {
  selectedItem: LayoutItem;
  onUpdateSelectedItem: UpdateSelectedItem;
}

export function GraphWindowSection(props: GraphWindowSectionProps) {
  const { t } = useTranslation();
  const { selectedItem, onUpdateSelectedItem } = props;
  if (selectedItem.widget !== "graph") return null;

  const updateMs = (key: "graph_before_ms" | "graph_after_ms", raw: string, low: number, high: number) => {
    onUpdateSelectedItem(key, Math.round(clamp(Number(raw), low, high) * 1000));
  };
  const updateLine = (raw: string) => {
    onUpdateSelectedItem("graph_line_thickness", clamp(Number(raw), 1, 24));
  };

  return (
    <details className="inspector-section" open>
      <summary><span className="section-dot active" />{t("layout.sectionGraphWindow")}</summary>
      <div className="section-body">
        <NumberControl
          controlKey="graph_before_ms"
          label={String(t("layout.graphBefore"))}
          value={(selectedItem.graph_before_ms ?? GRAPH_APPEARANCE_DEFAULTS.beforeMs) / 1000}
          min={0.1}
          max={30}
          step={0.1}
          onChange={(raw) => updateMs("graph_before_ms", raw, 0.1, 30)}
        />
        <NumberControl
          controlKey="graph_after_ms"
          label={String(t("layout.graphAfter"))}
          value={(selectedItem.graph_after_ms ?? GRAPH_APPEARANCE_DEFAULTS.afterMs) / 1000}
          min={0}
          max={30}
          step={0.1}
          onChange={(raw) => updateMs("graph_after_ms", raw, 0, 30)}
        />
        <NumberControl
          controlKey="graph_line_thickness"
          label={String(t("layout.controlThickness"))}
          value={selectedItem.graph_line_thickness ?? GRAPH_APPEARANCE_DEFAULTS.lineThickness}
          min={1}
          max={24}
          step={1}
          onChange={updateLine}
        />
      </div>
    </details>
  );
}
