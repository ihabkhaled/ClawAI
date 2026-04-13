'use client';

import { RepairType } from '@/enums/repair-type.enum';
import type { RepairTypeSelectorProps } from '@/types';

import { Checkbox } from '../ui/checkbox';

function RepairTypeItem({
  type,
  label,
  description,
  checked,
  onToggle,
}: {
  type: RepairType;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (type: RepairType) => void;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <Checkbox
        id={`repair-type-${type}`}
        checked={checked}
        onCheckedChange={() => onToggle(type)}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={`repair-type-${type}`} className="cursor-pointer font-medium">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function RepairTypeSelector({
  selectedTypes,
  onToggle,
  t,
}: RepairTypeSelectorProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t('repair.repairTypes')}</p>
      <RepairTypeItem
        type={RepairType.SCHEMA}
        label={t('repair.schemaLabel')}
        description={t('repair.schemaDesc')}
        checked={selectedTypes.includes(RepairType.SCHEMA)}
        onToggle={onToggle}
      />
      <RepairTypeItem
        type={RepairType.FORMAT}
        label={t('repair.formatLabel')}
        description={t('repair.formatDesc')}
        checked={selectedTypes.includes(RepairType.FORMAT)}
        onToggle={onToggle}
      />
      <RepairTypeItem
        type={RepairType.COMPLETENESS}
        label={t('repair.completenessLabel')}
        description={t('repair.completenessDesc')}
        checked={selectedTypes.includes(RepairType.COMPLETENESS)}
        onToggle={onToggle}
      />
      <RepairTypeItem
        type={RepairType.FACTUALITY}
        label={t('repair.factualityLabel')}
        description={t('repair.factualityDesc')}
        checked={selectedTypes.includes(RepairType.FACTUALITY)}
        onToggle={onToggle}
      />
    </div>
  );
}
