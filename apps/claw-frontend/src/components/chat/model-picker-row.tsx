import { ModelPickerItem } from '@/components/chat/model-picker-item';
import { MODEL_PICKER_LISTBOX_ID } from '@/constants/model-picker.constants';
import type { ModelPickerRowViewProps } from '@/types';

/** One virtualised row: a provider heading or a model option. */
export function ModelPickerRowView({
  row,
  isActive,
  isSelected,
  onSelect,
  onHover,
}: ModelPickerRowViewProps): React.ReactElement {
  if (row.kind === 'group') {
    return (
      <div role="presentation" className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
        {row.label}
      </div>
    );
  }
  return (
    <ModelPickerItem
      id={isActive ? `${MODEL_PICKER_LISTBOX_ID}-active` : undefined}
      option={row.option}
      isSelected={isSelected}
      isActive={isActive}
      onSelect={onSelect}
      onHover={onHover}
    />
  );
}
