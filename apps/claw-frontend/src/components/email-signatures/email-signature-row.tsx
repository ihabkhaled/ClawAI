'use client';

import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { EmailSignatureRowProps } from '@/types/email-signature-components.types';

export function EmailSignatureRow({
  signature,
  onEdit,
  onDelete,
  isDeleting,
  canManage,
  labels,
}: EmailSignatureRowProps): ReactElement {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{signature.name}</h3>
            {signature.isDefault ? <Badge variant="default">{labels.defaultBadge}</Badge> : null}
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {signature.body}
          </pre>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-col gap-1">
            <Button size="sm" variant="outline" onClick={() => onEdit(signature)}>
              {labels.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isDeleting}
              onClick={() => onDelete(signature.id)}
            >
              {isDeleting ? labels.deleting : labels.delete}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
