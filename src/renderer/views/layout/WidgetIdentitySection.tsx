import { useTranslation } from "react-i18next";
import type { AppMetadata, LayoutItem } from "../../../shared/types";
import { widgetTypesForSource } from "../../../shared/util";
import { widgetTypeLabel } from "../../utils";
import type { UpdateSelectedItem } from "../layoutTypes";

interface WidgetIdentitySectionProps {
  metadata: AppMetadata;
  selectedItem: LayoutItem;
  onChangeSelectedSource: (source: string) => void;
  onUpdateSelectedItem: UpdateSelectedItem;
}

export function WidgetIdentitySection(props: WidgetIdentitySectionProps) {
  const { t } = useTranslation();
  const {
    metadata,
    selectedItem,
    onChangeSelectedSource,
    onUpdateSelectedItem,
  } = props;

  return (
    <>
      <input
        className="inspector-name-input"
        value={selectedItem.name}
        onChange={(e) => onUpdateSelectedItem("name", e.target.value)}
        placeholder={t("layout.name")}
      />
      <div className="prop-row">
        <span className="prop-label">{t("layout.source")}</span>
        <select
          className="prop-select"
          value={selectedItem.source}
          onChange={(e) => onChangeSelectedSource(e.target.value)}
        >
          {metadata.sources.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>
      <div className="prop-row">
        <span className="prop-label">{t("layout.widgetType")}</span>
        <select
          className="prop-select"
          value={selectedItem.widget}
          onChange={(e) => onUpdateSelectedItem("widget", e.target.value)}
        >
          {widgetTypesForSource(metadata, selectedItem.source).map((widget) => (
            <option key={widget} value={widget}>{widgetTypeLabel(widget)}</option>
          ))}
        </select>
      </div>
    </>
  );
}
