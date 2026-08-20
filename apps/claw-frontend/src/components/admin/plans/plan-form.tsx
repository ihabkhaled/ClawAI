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
            <p className="text-destructive text-xs">{fieldErrors.name}</p>
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
          <p className="text-muted-foreground text-xs">{t('adminPlans.form.slugHelp')}</p>
          {fieldErrors.slug !== undefined ? (
            <p className="text-destructive text-xs">{fieldErrors.slug}</p>
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
          <p className="text-destructive text-xs">{fieldErrors.description}</p>
        ) : null}
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
          <p className="text-muted-foreground text-xs">
            {t('adminPlans.form.dailyTokenQuotaHelp')}
          </p>
          {fieldErrors.dailyTokenQuota !== undefined ? (
            <p className="text-destructive text-xs">{fieldErrors.dailyTokenQuota}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <label htmlFor="plan-weekly-quota" className="text-sm font-medium">
            {t('adminPlans.form.weeklyTokenQuota')}
          </label>
          <Input
            id="plan-weekly-quota"
            type="number"
            min={0}
            value={state.weeklyTokenQuota}
            onChange={(e) => setField('weeklyTokenQuota', e.target.value)}
            placeholder={t('adminPlans.form.unlimitedPlaceholder')}
            aria-invalid={fieldErrors.weeklyTokenQuota !== undefined}
          />
          {fieldErrors.weeklyTokenQuota !== undefined ? (
            <p className="text-destructive text-xs">{fieldErrors.weeklyTokenQuota}</p>
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
            <p className="text-destructive text-xs">{fieldErrors.monthlyTokenQuota}</p>
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

      <div className="border-border grid gap-3 rounded-lg border p-4">
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
          <div className="space-y-0.5">
            <label htmlFor="plan-is-trial" className="text-sm">
              {t('adminPlans.form.isTrial')}
            </label>
            <p className="text-muted-foreground text-xs">{t('adminPlans.form.trialHelp')}</p>
          </div>
          <Switch
            id="plan-is-trial"
            checked={state.isTrial}
            onCheckedChange={(next) => setField('isTrial', next)}
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
          <div className="space-y-0.5">
            <label htmlFor="plan-allow-critic" className="text-sm">
              {t('adminPlans.gate.allowCriticReview')}
            </label>
            <p className="text-muted-foreground text-xs">
              {t('adminPlans.featureAllowCriticReviewHint')}
            </p>
          </div>
          <Switch
            id="plan-allow-critic"
            checked={state.allowCriticReview}
            onCheckedChange={(next) => setField('allowCriticReview', next)}
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

      <div className="border-border grid gap-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">{t('adminPlans.form.orchestrationLabs')}</h3>
        <p className="text-muted-foreground text-xs">
          {t('adminPlans.form.orchestrationLabsHint')}
        </p>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-consensus" className="text-sm">
            {t('adminPlans.gate.allowConsensusMode')}
          </label>
          <Switch
            id="plan-allow-consensus"
            checked={state.allowConsensusMode}
            onCheckedChange={(next) => setField('allowConsensusMode', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-escalation" className="text-sm">
            {t('adminPlans.gate.allowEscalationChain')}
          </label>
          <Switch
            id="plan-allow-escalation"
            checked={state.allowEscalationChain}
            onCheckedChange={(next) => setField('allowEscalationChain', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-repair" className="text-sm">
            {t('adminPlans.gate.allowRepairLab')}
          </label>
          <Switch
            id="plan-allow-repair"
            checked={state.allowRepairLab}
            onCheckedChange={(next) => setField('allowRepairLab', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-decompose" className="text-sm">
            {t('adminPlans.gate.allowTaskDecomposer')}
          </label>
          <Switch
            id="plan-allow-decompose"
            checked={state.allowTaskDecomposer}
            onCheckedChange={(next) => setField('allowTaskDecomposer', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-best-of-n" className="text-sm">
            {t('adminPlans.gate.allowBestOfN')}
          </label>
          <Switch
            id="plan-allow-best-of-n"
            checked={state.allowBestOfN}
            onCheckedChange={(next) => setField('allowBestOfN', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-verifier" className="text-sm">
            {t('adminPlans.gate.allowVerifier')}
          </label>
          <Switch
            id="plan-allow-verifier"
            checked={state.allowVerifier}
            onCheckedChange={(next) => setField('allowVerifier', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-pipeline" className="text-sm">
            {t('adminPlans.gate.allowPipelineLab')}
          </label>
          <Switch
            id="plan-allow-pipeline"
            checked={state.allowPipelineLab}
            onCheckedChange={(next) => setField('allowPipelineLab', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-cost-ensemble" className="text-sm">
            {t('adminPlans.gate.allowCostEnsemble')}
          </label>
          <Switch
            id="plan-allow-cost-ensemble"
            checked={state.allowCostEnsemble}
            onCheckedChange={(next) => setField('allowCostEnsemble', next)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="plan-allow-role-pack" className="text-sm">
            {t('adminPlans.gate.allowRolePack')}
          </label>
          <Switch
            id="plan-allow-role-pack"
            checked={state.allowRolePack}
            onCheckedChange={(next) => setField('allowRolePack', next)}
          />
        </div>
      </div>

      {submitErrorMessage !== null ? (
        <p
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2 text-sm"
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
