import type React from "react";
import { useTranslation } from "react-i18next";
import type { LayoutItem } from "../../../shared/types";
import { BAR_APPEARANCE_DEFAULTS, clamp } from "../../../shared/util";
import { colorControlLabel, type ColorKey } from "../../utils";
import type { UpdateSelectedItem } from "../layoutTypes";
import { ColorControl, NumberControl } from "./InspectorControls";

interface AppearanceSectionProps {
  selectedItem: LayoutItem;
  onUpdateSelectedItem: UpdateSelectedItem;
}

const colorKeys: ColorKey[] = [
  "accent_color",
  "negative_color",
  "positive_color",
  "text_color",
  "bg_color",
  "outline_color",
];

export function AppearanceSection(props: AppearanceSectionProps) {
  const { t } = useTranslation();
  const { selectedItem, onUpdateSelectedItem } = props;

  const numberControl = (
    key: "bar_track_fill_thickness" | "bar_track_outline_thickness" | "bar_center_mark_thickness" | "bar_corner_radius",
    labelKey: string,
    value: number,
    min: number,
    max: number,
  ) => (
    <NumberControl
      controlKey={key}
      label={String(t(labelKey))}
      value={value}
      min={min}
      max={max}
      step={1}
      onChange={(raw) => onUpdateSelectedItem(key, clamp(Number(raw), min, max))}
    />
  );

  return (
    <details className="inspector-section" open>
      <summary>
        <span
          className={`section-dot${selectedItem.shadow_visible !== false ? " active" : ""}`}
          title={t("layout.shadow")}
          onClick={(event) => {
            event.preventDefault();
            onUpdateSelectedItem("shadow_visible", selectedItem.shadow_visible === false);
          }}
        />
        {t("layout.appearance")}
      </summary>
      <div className="section-body">
        {selectedItem.widget === "bar" ? (
          <BarAppearance
            selectedItem={selectedItem}
            numberControl={numberControl}
            onUpdateSelectedItem={onUpdateSelectedItem}
          />
        ) : (
          <div className="color-grid">
            {colorKeys
              .map((key) => [key, colorControlLabel(selectedItem, key)] as const)
              .filter((entry): entry is readonly [ColorKey, string] => entry[1] !== null)
              .map(([key, labelKey]) => (
                <ColorControl
                  key={key}
                  item={selectedItem}
                  colorKey={key}
                  label={String(t(labelKey))}
                  onUpdateSelectedItem={onUpdateSelectedItem}
                />
              ))}
          </div>
        )}
      </div>
    </details>
  );
}

function BarAppearance(props: {
  selectedItem: LayoutItem;
  numberControl: (
    key: "bar_track_fill_thickness" | "bar_track_outline_thickness" | "bar_center_mark_thickness" | "bar_corner_radius",
    labelKey: string,
    value: number,
    min: number,
    max: number,
  ) => React.ReactElement;
  onUpdateSelectedItem: UpdateSelectedItem;
}) {
  const { t } = useTranslation();
  const { selectedItem, numberControl, onUpdateSelectedItem } = props;
  return (
    <div className="bar-appearance-groups">
      <BarColorGroup title={String(t("layout.subgroupBarFills"))} item={selectedItem} keys={["negative_color", "positive_color"]} onUpdateSelectedItem={onUpdateSelectedItem} />
      <BarColorGroup title={String(t("colors.centerMark"))} item={selectedItem} keys={["text_color"]} onUpdateSelectedItem={onUpdateSelectedItem}>
        {numberControl("bar_center_mark_thickness", "layout.controlThickness", selectedItem.bar_center_mark_thickness ?? BAR_APPEARANCE_DEFAULTS.centerMarkThickness, 0, 24)}
      </BarColorGroup>
      <BarColorGroup title={String(t("colors.trackFill"))} item={selectedItem} keys={["bg_color"]} onUpdateSelectedItem={onUpdateSelectedItem}>
        {numberControl("bar_track_fill_thickness", "layout.controlThicknessPercent", selectedItem.bar_track_fill_thickness ?? BAR_APPEARANCE_DEFAULTS.trackFillThickness, 5, 100)}
      </BarColorGroup>
      <BarColorGroup title={String(t("colors.trackOutline"))} item={selectedItem} keys={["outline_color"]} onUpdateSelectedItem={onUpdateSelectedItem}>
        {numberControl("bar_track_outline_thickness", "layout.controlThickness", selectedItem.bar_track_outline_thickness ?? BAR_APPEARANCE_DEFAULTS.trackOutlineThickness, 0, 24)}
      </BarColorGroup>
      <div className="bar-appearance-group">
        <div className="bar-appearance-heading">{t("layout.subgroupBarAppearance")}</div>
        {numberControl("bar_corner_radius", "layout.barCornerRadius", selectedItem.bar_corner_radius ?? BAR_APPEARANCE_DEFAULTS.cornerRadius, 0, 100)}
      </div>
    </div>
  );
}

function BarColorGroup(props: {
  title: string;
  item: LayoutItem;
  keys: ColorKey[];
  onUpdateSelectedItem: UpdateSelectedItem;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { title, item, keys, onUpdateSelectedItem, children } = props;
  return (
    <div className="bar-appearance-group">
      <div className="bar-appearance-heading">{title}</div>
      {keys.map((key) => (
        <ColorControl
          key={key}
          item={item}
          colorKey={key}
          label={String(t(key === "text_color" ? "layout.controlColor" : colorControlLabel(item, key) ?? "layout.controlColor"))}
          onUpdateSelectedItem={onUpdateSelectedItem}
        />
      ))}
      {children}
    </div>
  );
}
