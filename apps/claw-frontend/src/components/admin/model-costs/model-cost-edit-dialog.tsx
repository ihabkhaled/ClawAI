'use client';

import type { ReactElement } from 'react';

import { ModelCostEditForm } from '@/components/admin/model-costs/model-cost-edit-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ModelCostEditDialogProps } from '@/types/model-cost.types';

/**
 * Publishes a new price version for one model.
 *
 * The form is keyed on the model so each open starts from THAT model's
 * resolved rates — a shared instance would carry the previous model's numbers
 * into the next publish.
 */
export function ModelCostEditDialog({
  open,
  row,
  isSubmitting,
  submitError,
  onOpenChange,
  onSubmit,
  t,
}: ModelCostEditDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('adminModelCosts.form.title')}</DialogTitle>
          <DialogDescription>
            {row === null
              ? t('adminModelCosts.form.description')
              : t('adminModelCosts.form.descriptionFor', {
                  provider: row.provider,
                  model: row.modelKey,
                })}
          </DialogDescription>
        </DialogHeader>

        {row === null ? null : (
          <ModelCostEditForm
            key={`${row.provider}:${row.modelKey}`}
            row={row}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
            t={t}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
