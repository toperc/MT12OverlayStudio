import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

interface InspectorToolbarProps {
  canEdit: boolean;
  onAddWidget: () => void;
  onDuplicateWidget: () => void;
  onDeleteWidget: () => void;
  onResetLayout: () => void;
}

export function InspectorToolbar(props: InspectorToolbarProps) {
  const { t } = useTranslation();
  const { canEdit, onAddWidget, onDuplicateWidget, onDeleteWidget, onResetLayout } = props;

  return (
    <div className="widget-toolbar">
      <button onClick={onAddWidget}><Plus size={18} /> {t("layout.add")}</button>
      <button onClick={onDuplicateWidget} disabled={!canEdit}>{t("layout.duplicate")}</button>
      <button onClick={onDeleteWidget} disabled={!canEdit}>{t("layout.delete")}</button>
      <button onClick={onResetLayout}>{t("layout.reset")}</button>
    </div>
  );
}
