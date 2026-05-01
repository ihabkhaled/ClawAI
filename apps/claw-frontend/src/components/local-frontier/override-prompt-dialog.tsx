'use client';

import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OverridePromptDialogProps } from '@/types/local-frontier-ui.types';

export function OverridePromptDialog({
  open,
  entry,
  compat,
  isPending,
  onCancel,
  onConfirm,
  labels,
}: OverridePromptDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-amber-500" aria-hidden />
            {labels.title}
          </DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {entry ? (
            <p className="text-sm font-medium text-foreground">
              {entry.displayName}{' '}
              <span className="text-xs text-muted-foreground">({entry.parameterCount})</span>
            </p>
          ) : null}
          <p className="text-xs font-medium text-muted-foreground">{labels.reasonsTitle}</p>
          <ul className="ml-4 list-disc text-xs text-muted-foreground">
            {(compat?.reasons ?? []).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {labels.cancel}
          </Button>
          <Button variant="default" disabled={isPending} onClick={onConfirm}>
            {labels.proceed}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
