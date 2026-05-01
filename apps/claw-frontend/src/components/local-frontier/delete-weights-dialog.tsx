'use client';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { DeleteWeightsDialogProps } from '@/types/local-frontier-ui.types';

export function DeleteWeightsDialog({
  open,
  entry,
  inputValue,
  isPending,
  onInputChange,
  onCancel,
  onConfirm,
  labels,
}: DeleteWeightsDialogProps): React.ReactElement {
  const expected = entry ? `${entry.name}:${entry.tag}` : '';
  const matches = inputValue.trim() === expected && expected.length > 0;

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" aria-hidden />
            {labels.title}
          </DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {labels.warning}
          </p>
          <label htmlFor="lf-confirm" className="text-xs font-medium text-muted-foreground">
            {labels.promptLabel}: <span className="font-mono text-foreground">{expected}</span>
          </label>
          <Input
            id="lf-confirm"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={labels.placeholder}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {labels.cancel}
          </Button>
          <Button variant="destructive" disabled={!matches || isPending} onClick={onConfirm}>
            {labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
