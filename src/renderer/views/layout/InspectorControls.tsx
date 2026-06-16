import type React from "react";
import type { LayoutItem } from "../../../shared/types";
import type { ColorKey } from "../../utils";
import type { UpdateSelectedItem } from "../layoutTypes";

interface NumberControlProps {
  controlKey: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (raw: string) => void;
}

interface ColorControlProps {
  item: LayoutItem;
  colorKey: ColorKey;
  label: string;
  onUpdateSelectedItem: UpdateSelectedItem;
}

export function NumberControl(props: NumberControlProps) {
  const { controlKey, label, value, min, max, step, onChange } = props;
  return (
    <div className="prop-row" key={controlKey}>
      <span className="prop-label" title={label}>{label}</span>
      <input
        type="range"
        className="prop-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="number"
        className="prop-number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ColorControl(props: ColorControlProps) {
  const { item, colorKey, label, onUpdateSelectedItem } = props;
  const isOff =
    (colorKey === "bg_color" && item.bg_visible === false) ||
    (colorKey === "outline_color" && item.outline_visible === false);
  const hasToggle = colorKey === "bg_color" || colorKey === "outline_color";
  const toggleKey = colorKey === "bg_color" ? "bg_visible" : "outline_visible";

  return (
    <div key={colorKey} className={`color-cell${isOff ? " off" : ""}`}>
      <span className="color-cell-label" title={label}>{label}</span>
      <div className="color-cell-top">
        {hasToggle && (
          <input
            type="checkbox"
            className="color-cell-toggle"
            checked={!isOff}
            onChange={(e) => onUpdateSelectedItem(
              toggleKey as keyof LayoutItem,
              e.target.checked as LayoutItem[keyof LayoutItem],
            )}
          />
        )}
        <div
          className="color-cell-swatch-wrap"
          style={{ "--swatch-color": String(item[colorKey]) } as React.CSSProperties}
        >
          <input
            type="color"
            className="color-cell-swatch"
            disabled={isOff}
            value={String(item[colorKey])}
            onChange={(e) => onUpdateSelectedItem(colorKey, e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
