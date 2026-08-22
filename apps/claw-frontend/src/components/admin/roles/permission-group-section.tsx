'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { PermissionGroupSectionProps } from '@/types';

export function PermissionGroupSection({
  group,
  selected,
  togglePermission,
  selectGroup,
  disabled,
  t,
}: PermissionGroupSectionProps): ReactElement {
  const allSelected = group.permissions.every((permission) => selected.has(permission));

  return (
    <div className="border-border grid grid-cols-1 gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t(`adminRoles.group.${group.groupKey}`)}</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => selectGroup(group.groupKey, !allSelected)}
        >
          {allSelected ? t('adminRoles.detail.clearGroup') : t('adminRoles.detail.selectGroup')}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {group.permissions.map((permission) => (
          <label key={permission} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.has(permission)}
              disabled={disabled}
              onCheckedChange={() => togglePermission(permission)}
            />
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{permission}</code>
          </label>
        ))}
      </div>
    </div>
  );
}
