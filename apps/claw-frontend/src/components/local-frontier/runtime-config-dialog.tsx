'use client';

import { Settings } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { RuntimeConfigDialogProps } from '@/types/local-frontier-ui.types';

export function RuntimeConfigDialog({
  open,
  loaded,
  draft,
  isPending,
  onChange,
  onCancel,
  onSave,
  labels,
}: RuntimeConfigDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onCancel())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4" aria-hidden />
            {labels.title}
          </DialogTitle>
          <DialogDescription>
            {labels.description}
            {loaded ? (
              <span className="text-foreground ml-1 font-mono text-xs">
                ({loaded.name}:{loaded.tag})
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="lf-ngpu" className="text-muted-foreground text-xs font-medium">
              {labels.ngpuLayers}
            </label>
            <Input
              id="lf-ngpu"
              type="number"
              inputMode="numeric"
              value={draft.nGpuLayers ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  nGpuLayers: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
            <span className="touch:text-xs text-muted-foreground text-[10px]">
              {labels.ngpuLayersHint}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="lf-ctx" className="text-muted-foreground text-xs font-medium">
              {labels.ctxSize}
            </label>
            <Input
              id="lf-ctx"
              type="number"
              inputMode="numeric"
              value={draft.ctxSize}
              onChange={(e) => onChange({ ...draft, ctxSize: Number(e.target.value) })}
            />
            <span className="touch:text-xs text-muted-foreground text-[10px]">
              {labels.ctxSizeHint}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="lf-threads" className="text-muted-foreground text-xs font-medium">
              {labels.threads}
            </label>
            <Input
              id="lf-threads"
              type="number"
              inputMode="numeric"
              value={draft.threads ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  threads: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
            <span className="touch:text-xs text-muted-foreground text-[10px]">
              {labels.threadsHint}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">{labels.cpuMoe}</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.cpuMoe}
                onCheckedChange={(value) => onChange({ ...draft, cpuMoe: value })}
                aria-label={labels.cpuMoe}
              />
              <span className="text-muted-foreground text-xs">{labels.cpuMoeHint}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="lf-args" className="text-muted-foreground text-xs font-medium">
              {labels.customArgs}
            </label>
            <Textarea
              id="lf-args"
              rows={3}
              value={draft.customArgs ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  customArgs: e.target.value.length === 0 ? null : e.target.value,
                })
              }
              placeholder="--mlock --n-batch 512"
            />
            <span className="touch:text-xs text-muted-foreground text-[10px]">
              {labels.customArgsHint}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {labels.cancel}
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
