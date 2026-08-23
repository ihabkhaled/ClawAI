'use client';

import type { ReactElement } from 'react';

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
import { useRoleForm } from '@/hooks/roles/use-role-form';
import type { RoleFormDialogProps } from '@/types';

export function RoleFormDialog({
  open,
  onOpenChange,
  onSubmitCreate,
  isSubmitting,
  submitErrorMessage,
  t,
}: RoleFormDialogProps): ReactElement {
  const { state, setField, fieldErrors, buildCreateRequest } = useRoleForm();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const payload = buildCreateRequest();
    if (payload !== null) {
      onSubmitCreate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('adminRoles.create.title')}</DialogTitle>
          <DialogDescription>{t('adminRoles.create.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="role-name" className="text-sm font-medium">
              {t('adminRoles.form.name')}
            </label>
            <Input
              id="role-name"
              value={state.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={t('adminRoles.form.namePlaceholder')}
              aria-invalid={fieldErrors.name !== undefined}
            />
            {fieldErrors.name !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="role-slug" className="text-sm font-medium">
              {t('adminRoles.form.slug')}
            </label>
            <Input
              id="role-slug"
              value={state.slug}
              onChange={(e) => setField('slug', e.target.value)}
              placeholder="content-editor"
              aria-invalid={fieldErrors.slug !== undefined}
            />
            <p className="text-muted-foreground text-xs">{t('adminRoles.form.slugHelp')}</p>
            {fieldErrors.slug !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.slug}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="role-description" className="text-sm font-medium">
              {t('adminRoles.form.description')}
            </label>
            <Textarea
              id="role-description"
              value={state.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={2}
            />
            {fieldErrors.description !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.description}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label htmlFor="role-is-assignable" className="text-sm font-medium">
              {t('adminRoles.form.isAssignable')}
            </label>
            <Switch
              id="role-is-assignable"
              checked={state.isAssignable}
              onCheckedChange={(next) => setField('isAssignable', next)}
            />
          </div>

          {submitErrorMessage !== null ? (
            <p
              className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2 text-sm"
              role="alert"
            >
              {submitErrorMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('adminRoles.create.submitting') : t('adminRoles.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
