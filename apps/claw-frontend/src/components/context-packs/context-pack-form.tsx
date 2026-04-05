import { useEffect, useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';
import { createContextPackSchema } from '@/lib/validation/context-pack.schema';
import type { ContextPackFormProps, CreateContextPackRequest, FormFieldErrors } from '@/types';

export function ContextPackForm({ open, onOpenChange, onSubmit, isPending }: ContextPackFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setScope('');
      setFieldErrors({});
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const payload: Record<string, unknown> = { name };
    if (description.trim()) {
      payload.description = description;
    }
    if (scope.trim()) {
      payload.scope = scope;
    }

    const result = createContextPackSchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(result.data as CreateContextPackRequest);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Context Pack</DialogTitle>
          <DialogDescription>
            Create a new context pack to group instructions, notes, and file references for AI
            interactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="pack-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My context pack"
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="pack-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="pack-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this pack is for..."
              rows={3}
            />
            {fieldErrors.description ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.description[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="pack-scope" className="text-sm font-medium">
              Scope (optional)
            </label>
            <Input
              id="pack-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g. global, project-specific"
            />
            {fieldErrors.scope ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.scope[0]}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Pack'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
