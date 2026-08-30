'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MODEL_COST_CLASS_LABEL_KEYS,
  MODEL_COST_CLASS_OPTIONS,
} from '@/constants/model-cost.constants';
import { useModelCostForm } from '@/hooks/admin/use-model-cost-form';
import type { ModelCostEditFormProps } from '@/types/model-cost.types';
import { toCostClass } from '@/utilities/model-cost-form.utility';

/**
 * The rate fields, in dollars per million tokens.
 *
 * Must be mounted with a `key` tied to the model: the form is seeded once from
 * the row, so reusing the instance across two different models would publish
 * one model's rates under the other's key.
 */
export function ModelCostEditForm({
  row,
  isSubmitting,
  submitError,
  onCancel,
  onSubmit,
  t,
}: ModelCostEditFormProps): ReactElement {
  const form = useModelCostForm(row);

  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const request = form.buildRequest();
        if (request !== null) {
          onSubmit(request);
        }
      }}
    >
      <div className="grid grid-cols-1 gap-1">
        <label className="text-sm font-medium" htmlFor="model-cost-input-rate">
          {t('adminModelCosts.form.inputRate')}
        </label>
        <Input
          id="model-cost-input-rate"
          inputMode="decimal"
          value={form.state.inputDollarsPerMillion}
          placeholder={t('adminModelCosts.form.ratePlaceholder')}
          aria-invalid={form.errors.inputDollarsPerMillion !== null}
          onChange={(event) => form.setInputDollarsPerMillion(event.target.value)}
        />
        {form.errors.inputDollarsPerMillion === null ? null : (
          <p className="text-destructive text-xs" role="alert">
            {form.errors.inputDollarsPerMillion}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1">
        <label className="text-sm font-medium" htmlFor="model-cost-output-rate">
          {t('adminModelCosts.form.outputRate')}
        </label>
        <Input
          id="model-cost-output-rate"
          inputMode="decimal"
          value={form.state.outputDollarsPerMillion}
          placeholder={t('adminModelCosts.form.ratePlaceholder')}
          aria-invalid={form.errors.outputDollarsPerMillion !== null}
          onChange={(event) => form.setOutputDollarsPerMillion(event.target.value)}
        />
        {form.errors.outputDollarsPerMillion === null ? null : (
          <p className="text-destructive text-xs" role="alert">
            {form.errors.outputDollarsPerMillion}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1">
        <label className="text-sm font-medium" htmlFor="model-cost-cached-rate">
          {t('adminModelCosts.form.cachedInputRate')}
        </label>
        <Input
          id="model-cost-cached-rate"
          inputMode="decimal"
          value={form.state.cachedInputDollarsPerMillion}
          placeholder={t('adminModelCosts.form.ratePlaceholder')}
          aria-invalid={form.errors.cachedInputDollarsPerMillion !== null}
          onChange={(event) => form.setCachedInputDollarsPerMillion(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">{t('adminModelCosts.form.cachedInputHelp')}</p>
        {form.errors.cachedInputDollarsPerMillion === null ? null : (
          <p className="text-destructive text-xs" role="alert">
            {form.errors.cachedInputDollarsPerMillion}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1">
        <label className="text-sm font-medium" htmlFor="model-cost-class">
          {t('adminModelCosts.form.costClass')}
        </label>
        <Select
          value={form.state.costClass}
          onValueChange={(value) => form.setCostClass(toCostClass(value))}
        >
          <SelectTrigger id="model-cost-class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_COST_CLASS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(MODEL_COST_CLASS_LABEL_KEYS[option])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-muted-foreground rounded-md border p-3 text-xs">
        {t('adminModelCosts.form.publishHelp')}
      </p>

      {submitError === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {submitError.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('adminModelCosts.form.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting || !form.isValid} isLoading={isSubmitting}>
          {t('adminModelCosts.form.publish')}
        </Button>
      </DialogFooter>
    </form>
  );
}
