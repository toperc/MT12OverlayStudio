import { useTranslation } from "react-i18next";
import type { LayoutItem } from "../../../shared/types";
import { clamp, widgetSize } from "../../../shared/util";
import type { UpdateSelectedItem, UpdateSelectedNumber } from "../layoutTypes";

interface TransformSectionProps {
  selectedItem: LayoutItem;
  outputWidth: number;
  outputHeight: number;
  onUpdateSelectedItem: UpdateSelectedItem;
  onUpdateSelectedNumber: UpdateSelectedNumber;
}

export function TransformSection(props: TransformSectionProps) {
  const { t } = useTranslation();
  const {
    selectedItem,
    outputWidth,
    outputHeight,
    onUpdateSelectedItem,
    onUpdateSelectedNumber,
  } = props;
  const [baseW, baseH] = widgetSize(selectedItem.widget);
  const scale = Math.max(0.2, Math.min(outputWidth / 1920, outputHeight / 1080));
  const pxW = Math.round(Math.max(32, baseW * scale * selectedItem.scale_x));
  const pxH = Math.round(Math.max(24, baseH * scale * selectedItem.scale_y));
  const maxW = Math.round(baseW * scale * 12);
  const maxH = Math.round(baseH * scale * 12);
  const minW = Math.round(Math.max(32, baseW * scale * 0.2));
  const minH = Math.round(Math.max(24, baseH * scale * 0.2));
  const updateW = (px: number) => {
    if (Number.isFinite(px) && px >= 1) onUpdateSelectedItem("scale_x", clamp(px / (baseW * scale), 0.2, 12));
  };
  const updateH = (px: number) => {
    if (Number.isFinite(px) && px >= 1) onUpdateSelectedItem("scale_y", clamp(px / (baseH * scale), 0.2, 12));
  };

  return (
    <details className="inspector-section" open>
      <summary><span className="section-dot active" />{t("layout.sectionTransform")}</summary>
      <div className="section-body">
        <div className="prop-subgroup-label">{t("layout.subgroupPosition")}</div>
        <AxisControl label="X" value={selectedItem.x} onChange={(value) => onUpdateSelectedNumber("x", value, 0.05, 0.95)} />
        <AxisControl label="Y" value={selectedItem.y} onChange={(value) => onUpdateSelectedNumber("y", value, 0.05, 0.95)} />

        <div className="prop-subgroup-label">{t("layout.subgroupSize")}</div>
        <PixelControl label="W" value={pxW} min={minW} max={maxW} onChange={(value) => updateW(Number(value))} />
        <PixelControl label="H" value={pxH} min={minH} max={maxH} onChange={(value) => updateH(Number(value))} />

        <div className="prop-subgroup-label">{t("layout.subgroupRotation")}</div>
        <div className="prop-row">
          <span className="prop-label">{t("layout.rotation")}</span>
          <input
            type="range"
            className="prop-slider"
            min={-180}
            max={180}
            step={1}
            value={selectedItem.rotation ?? 0}
            onChange={(event) => onUpdateSelectedNumber("rotation", event.target.value, -180, 180)}
          />
          <input
            type="number"
            className="prop-number"
            min={-180}
            max={180}
            step={1}
            value={Math.round(selectedItem.rotation ?? 0)}
            onChange={(event) => onUpdateSelectedNumber("rotation", event.target.value, -180, 180)}
          />
        </div>
      </div>
    </details>
  );
}

function AxisControl(props: { label: string; value: number; onChange: (value: string) => void }) {
  const { label, value, onChange } = props;
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      <input
        type="range"
        className="prop-slider"
        min={0.05}
        max={0.95}
        step={0.001}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        type="number"
        className="prop-number"
        min={0.05}
        max={0.95}
        step={0.001}
        value={Number(value).toFixed(3)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function PixelControl(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const { label, value, min, max, onChange } = props;
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      <input
        type="range"
        className="prop-slider"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        type="number"
        className="prop-number"
        min={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
