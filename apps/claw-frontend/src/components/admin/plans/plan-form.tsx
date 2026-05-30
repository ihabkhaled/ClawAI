'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { PlanFormProps } from '@/types';
import { resolvePlanSubmitLabelKey } from '@/utilities';

export function PlanForm({
  state,
  fieldErrors,
  setField,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit,
  submitErrorMessage,
  t,
}: PlanFormProps): ReactElement {
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="plan-name" className="text-sm font-medium">
            {t('adminPlans.form.name')}
          </label>
          <Input
            id="plan-name"
            value={state.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder={t('adminPlans.form.namePlaceholder')}
            aria-invalid={fieldErrors.name !== undefined}
          />
          {fieldErrors.name !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label htmlFor="plan-slug" className="text-sm font-medium">
            {t('adminPlans.form.slug')}
          </label>
          <Input
            id="plan-slug"
            value={state.slug}
            onChange={(e) => setField('slug', e.target.value)}
            disabled={isEdit}
            placeholder="pro"
            aria-invalid={fieldErrors.slug !== undefined}
          />
          <p className="text-xs text-muted-foreground">{t('adminPlans.form.slugHelp')}</p>
          {fieldErrors.slug !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors.slug}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="plan-description" className="text-sm font-medium">
          {t('adminPlans.form.description')}
        </label>
        <Textarea
          id="plan-description"
          value={state.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={2}
        />
        {fieldErrors.description !== undefined ? (
          <p className="text-xs text-destructive">{fieldErrors.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <label htmlFor="plan-price-monthly" className="text-sm font-medium">
            {t('adminPlans.form.priceMonthly')}
          </label>
          <Input
            id="plan-price-monthly"
            type="number"
            min={0}
            value={state.priceMonthly}
            onChange={(e) => setField('priceMonthly', e.target.value)}
            aria-invalid={fieldErrors.priceMonthly !== undefined}
          />
          {fieldErrors.priceMonthly !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors.priceMonthly}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-price-yearly" className="text-sm font-medium">
            {t('adminPlans.form.priceYearly')}
          </label>
          <Input
            id="plan-price-yearly"
            type="number"
            min={0}
            value={state.priceYearly}
            onChange={(e) => setField('priceYearly', e.target.value)}
            aria-invalid={fieldErrors.priceYearly !== undefined}
          />
          {fieldErrors.priceYearly !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors.priceYearly}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-currency" className="text-sm font-medium">
            {t('adminPlans.form.currency')}
          </label>
          <Input
            id="plan-currency"
            value={state.currency}
            onChange={(e) => setField('currency', e.target.value)}
            placeholder="USD"
            aria-invalid={fieldErrors.currency !== undefined}
          />
          {fieldErrors.currency !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors.currency}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="plan-daily-quota" className="text-sm font-medium">
            {t('adminPlans.form.dailyTokenQuota')}
          </label>
          <Input
            id="plan-daily-quota"
            type="number"
            min={0}
            value={state.dailyTokenQuota}
            onChange={(e) => setField('dailyTokenQuota', e.target.value)}
            aria-invalid={fieldErrors.dailyTokenQuota !== undefined}
          />
          <p className="text-xs text-muted-foreground">
            {t('adminPlans.form.dailyTokenQuotaHelp')}
          </p>
          {fieldErrors.dailyTokenQuota !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors.dailyTokenQuota}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-monthly-quota" className="text-sm font-medium">
            {t('adminPlans.form.monthlyTokenQuota')}
          </label>
          <Input
            id="plan-monthly-quota"
            type="number"
            min={0}
            value={state.monthlyTokenQuota}
            onChange={(e) => setField('monthlyTokenQuota', e.target.value)}
            placeholder={t('adminPlans.form.unlimitedPlaceholder')}
            aria-invalid={fieldErrors.monthlyTokenQuota !== undefined}
          />
          {fieldErrors.monthlyTokenQuota !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors.monthlyTokenQuota}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <label htmlFor="plan-max-chats" className="text-sm font-medium">
            {t('adminPlans.form.maxChatsPerDay')}
          </label>
          <Input
            id="plan-max-chats"
            type="number"
            min={0}
            value={state.maxChatsPerDay}
            onChange={(e) => setField('maxChatsPerDay', e.target.value)}
            placeholder={t('adminPlans.form.unlimitedPlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-max-messages" className="text-sm font-medium">
            {t('adminPlans.form.maxMessagesPerDay')}
          </label>
          <Input
            id="plan-max-messages"
            type="number"
            min={0}
            value={state.maxMessagesPerDay}
            onChange={(e) => setField('maxMessagesPerDay', e.target.value)}
            placeholder={t('adminPlans.form.unlimitedPlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-max-workspaces" className="text-sm font-medium">
            {t('adminPlans.form.maxWorkspaceConnections')}
          </label>
          <Input
            id="plan-max-workspaces"
            type="number"
            min={0}
            value={state.maxWorkspaceConnections}
            onChange={(e) => setField('maxWorkspaceConnections', e.target.value)}
            placeholder={t('adminPlans.form.unlimitedPlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-max-packs" className="text-sm font-medium">
            {t('adminPlans.form.maxContextPacks')}
          </label>
          <Input
            id="plan-max-packs"
            type="number"
            min={0}
            value={state.maxContextPacks}
            onChange={(e) => setField('maxContextPacks', e.target.value)}
            placeholder={t('adminPlans.form.unlimitedPlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-max-memory" className="text-sm font-medium">
            {t('adminPlans.form.maxMemoryItems')}
          </label>
          <Input
            id="plan-max-memory"
            type="number"
            min={0}
            value={state.maxMemoryItems}
            onChange={(e) => setField('maxMemoryItems', e.target.value)}
            placeholder={t('adminPlans.form.unlimitedPlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-display-order" className="text-sm font-medium">
            {t('adminPlans.form.displayOrder')}
          </label>
          <Input
            id="plan-display-order"
            type="number"
            min={0}
            value={state.displayOrder}
            onChange={(e) => setField('displayOrder', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">{t('adminPlans.form.featureGates')}</h3>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-is-public" className="text-sm">
            {t('adminPlans.form.isPublic')}
          </label>
          <Switch
            id="plan-is-public"
            checked={state.isPublic}
            onCheckedChange={(next) => setField('isPublic', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-compare" className="text-sm">
            {t('adminPlans.gate.allowCompareMode')}
          </label>
          <Switch
            id="plan-allow-compare"
            checked={state.allowCompareMode}
            onCheckedChange={(next) => setField('allowCompareMode', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-judge" className="text-sm">
            {t('adminPlans.gate.allowJudgeMode')}
          </label>
          <Switch
            id="plan-allow-judge"
            checked={state.allowJudgeMode}
            onCheckedChange={(next) => setField('allowJudgeMode', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-research" className="text-sm">
            {t('adminPlans.gate.allowResearchMode')}
          </label>
          <Switch
            id="plan-allow-research"
            checked={state.allowResearchMode}
            onCheckedChange={(next) => setField('allowResearchMode', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-workspaces" className="text-sm">
            {t('adminPlans.gate.allowWorkspaces')}
          </label>
          <Switch
            id="plan-allow-workspaces"
            checked={state.allowWorkspaces}
            onCheckedChange={(next) => setField('allowWorkspaces', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-memory" className="text-sm">
            {t('adminPlans.gate.allowMemory')}
          </label>
          <Switch
            id="plan-allow-memory"
            checked={state.allowMemory}
            onCheckedChange={(next) => setField('allowMemory', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-packs" className="text-sm">
            {t('adminPlans.gate.allowContextPacks')}
          </label>
          <Switch
            id="plan-allow-packs"
            checked={state.allowContextPacks}
            onCheckedChange={(next) => setField('allowContextPacks', next)}
          />
        </div>
      </div>

      {submitErrorMessage !== null ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
          role="alert"
        >
          {submitErrorMessage}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {t(resolvePlanSubmitLabelKey(isSubmitting, isEdit))}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
