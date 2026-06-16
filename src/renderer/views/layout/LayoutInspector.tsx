import { useTranslation } from "react-i18next";
import type { AppMetadata, LayoutItem } from "../../../shared/types";
import { itemName } from "../../utils";
import type { LayoutEntry, UpdateSelectedItem, UpdateSelectedNumber } from "../layoutTypes";
import { AppearanceSection } from "./AppearanceSection";
import { DataPipelineSection } from "./DataPipelineSection";
import { GraphWindowSection } from "./GraphWindowSection";
import { InspectorToolbar } from "./InspectorToolbar";
import { TransformSection } from "./TransformSection";
import { WidgetIdentitySection } from "./WidgetIdentitySection";

interface LayoutInspectorProps {
  metadata: AppMetadata;
  selectedItemId: string;
  selectedItem: LayoutItem | undefined;
  layoutItems: LayoutEntry[];
  outputWidth: number;
  outputHeight: number;
  onSetSelectedItemId: (id: string) => void;
  onAddWidget: () => void;
  onDuplicateWidget: () => void;
  onDeleteWidget: () => void;
  onResetLayout: () => void;
  onChangeSelectedSource: (source: string) => void;
  onUpdateSelectedItem: UpdateSelectedItem;
  onUpdateSelectedNumber: UpdateSelectedNumber;
}

export function LayoutInspector(props: LayoutInspectorProps) {
  const { t } = useTranslation();
  const {
    metadata, selectedItemId, selectedItem, layoutItems, outputWidth, outputHeight,
    onSetSelectedItemId, onAddWidget, onDuplicateWidget, onDeleteWidget,
    onResetLayout, onChangeSelectedSource, onUpdateSelectedItem, onUpdateSelectedNumber,
  } = props;

  return (
    <aside className="inspector-sidebar">
      <InspectorToolbar
        canEdit={Boolean(selectedItem)}
        onAddWidget={onAddWidget}
        onDuplicateWidget={onDuplicateWidget}
        onDeleteWidget={onDeleteWidget}
        onResetLayout={onResetLayout}
      />
      <label className="field">
        <span>{t("layout.selectedWidget")}</span>
        <select value={selectedItemId} onChange={(event) => onSetSelectedItemId(event.target.value)}>
          <option value="">{t("layout.noWidgetSelected")}</option>
          {layoutItems.map(([id, item]) => (
            <option value={id} key={id}>{itemName(id, item)}</option>
          ))}
        </select>
      </label>

      {selectedItem ? (
        <div className="inspector">
          <WidgetIdentitySection
            metadata={metadata}
            selectedItem={selectedItem}
            onChangeSelectedSource={onChangeSelectedSource}
            onUpdateSelectedItem={onUpdateSelectedItem}
          />
          <DataPipelineSection selectedItem={selectedItem} onUpdateSelectedItem={onUpdateSelectedItem} />
          <GraphWindowSection selectedItem={selectedItem} onUpdateSelectedItem={onUpdateSelectedItem} />
          <TransformSection
            selectedItem={selectedItem}
            outputWidth={outputWidth}
            outputHeight={outputHeight}
            onUpdateSelectedItem={onUpdateSelectedItem}
            onUpdateSelectedNumber={onUpdateSelectedNumber}
          />
          <AppearanceSection selectedItem={selectedItem} onUpdateSelectedItem={onUpdateSelectedItem} />
        </div>
      ) : (
        <div className="empty small">{t("layout.selectOrAdd")}</div>
      )}
    </aside>
  );
}
