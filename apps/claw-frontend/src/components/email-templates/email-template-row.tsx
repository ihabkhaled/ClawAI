'use client';

import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { EmailTemplateRowProps } from '@/types/email-template-components.types';

export function EmailTemplateRow({
  template,
  onEdit,
  onDelete,
  isDeleting,
  canManage,
  labels,
}: EmailTemplateRowProps): ReactElement {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{template.name}</h3>
            {template.isDefault ? <Badge variant="default">{labels.defaultBadge}</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {labels.subjectLabel}: {template.subject}
          </p>
          <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {template.body}
          </pre>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-col gap-1">
            <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
              {labels.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isDeleting}
              onClick={() => onDelete(template.id)}
            >
              {isDeleting ? labels.deleting : labels.delete}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
