'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { RoleRowProps } from '@/types';

export function RoleRow({ role, pendingId, onDelete, detailHref, t }: RoleRowProps): ReactElement {
  const isPending = pendingId === role.id;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{role.name}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{role.slug}</code>
          {role.isSystem ? (
            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
              {t('adminRoles.systemBadge')}
            </span>
          ) : null}
          {role.isAssignable ? null : (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t('adminRoles.notAssignableBadge')}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {t('adminRoles.permissionCount', { count: String(role.permissions.length) })}
          </span>
        </div>

        {role.description !== null ? (
          <p className="text-sm text-muted-foreground">{role.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={detailHref}>{t('adminRoles.editPermissions')}</Link>
          </Button>
          {role.isSystem ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled
              title={t('adminRoles.cannotDelete')}
            >
              {t('common.delete')}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onDelete(role.id)}
              disabled={isPending}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
