import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { LayoutItem } from "../../../shared/types";
import type { UpdateSelectedItem } from "../layoutTypes";

interface DataPipelineSectionProps {
  selectedItem: LayoutItem;
  onUpdateSelectedItem: UpdateSelectedItem;
}

const transformOptions = ["min", "max", "avg", "%"] as const;

export function DataPipelineSection(props: DataPipelineSectionProps) {
  const { t } = useTranslation();
  const dragIndex = useRef<number>(-1);
  const { selectedItem, onUpdateSelectedItem } = props;
  const transforms = selectedItem.transforms ?? [];
  const setTransforms = (next: string[]) => onUpdateSelectedItem("transforms", next);

  const onDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    const from = dragIndex.current;
    if (from === index || from === -1) return;
    const next = [...transforms];
    next.splice(index, 0, next.splice(from, 1)[0]);
    dragIndex.current = index;
    setTransforms(next);
  };

  if (selectedItem.source === "time") return null;

  return (
    <details className="inspector-section" open>
      <summary><span className="section-dot active" />{t("layout.sectionDataPipeline")}</summary>
      <div className="section-body">
        <div className="transforms-list">
          {transforms.map((transform, index) => (
            <div key={index} className="transform-item">
              <div
                className="transform-row"
                draggable
                onDragStart={() => { dragIndex.current = index; }}
                onDragOver={(event) => onDragOver(event, index)}
                onDragEnd={() => { dragIndex.current = -1; }}
              >
                <span className="drag-handle">::</span>
                <select
                  className="prop-select"
                  value={transform}
                  onChange={(event) => {
                    const next = [...transforms];
                    next[index] = event.target.value;
                    setTransforms(next);
                  }}
                >
                  {transformOptions.map((value) => (
                    <option key={value} value={value}>{t(`layout.transform_${value}`)}</option>
                  ))}
                </select>
                <button
                  className="transform-remove"
                  onClick={() => setTransforms(transforms.filter((_, i) => i !== index))}
                >
                  x
                </button>
              </div>
              {transform === "%" && (
                <div className="transform-options">
                  <span className="prop-label">{t("layout.rangeMin")}</span>
                  <input
                    type="number"
                    className="prop-number wide"
                    value={selectedItem.range_min ?? -1024}
                    onChange={(event) => onUpdateSelectedItem("range_min", Number(event.target.value))}
                  />
                  <span className="prop-label center">{t("layout.rangeCenter")}</span>
                  <input
                    type="number"
                    className="prop-number wide"
                    value={selectedItem.range_center ?? 0}
                    onChange={(event) => onUpdateSelectedItem("range_center", Number(event.target.value))}
                  />
                  <span className="prop-label center">{t("layout.rangeMax")}</span>
                  <input
                    type="number"
                    className="prop-number wide"
                    value={selectedItem.range_max ?? 1024}
                    onChange={(event) => onUpdateSelectedItem("range_max", Number(event.target.value))}
                  />
                </div>
              )}
            </div>
          ))}
          <button className="transform-add" onClick={() => setTransforms([...transforms, "min"])}>
            + {t("layout.addTransform")}
          </button>
        </div>
      </div>
    </details>
  );
}
