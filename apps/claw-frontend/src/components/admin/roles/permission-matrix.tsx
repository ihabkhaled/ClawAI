'use client';

import type { ReactElement } from 'react';

import type { PermissionMatrixProps } from '@/types';

import { PermissionGroupSection } from './permission-group-section';

export function PermissionMatrix({
  groups,
  selected,
  togglePermission,
  selectGroup,
  disabled,
  t,
}: PermissionMatrixProps): ReactElement {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t('adminRoles.detail.noPermissions')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {groups.map((group) => (
        <PermissionGroupSection
          key={group.groupKey}
          group={group}
          selected={selected}
          togglePermission={togglePermission}
          selectGroup={selectGroup}
          disabled={disabled}
          t={t}
        />
      ))}
    </div>
  );
}
