import { AdminLiveModelChain } from '@/components/admin/live/admin-live-model-chain';
import { AdminLiveNumberField } from '@/components/admin/live/admin-live-number-field';
import { AdminLivePlanRow } from '@/components/admin/live/admin-live-plan-row';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { LIVE_MODEL_CHAIN_EDITORS } from '@/constants/live-model-chain.constants';
import { LIVE_POLICY_NUMBER_FIELDS } from '@/constants/live.constants';
import { LivePolicyFlag } from '@/enums/live.enum';
import type { AdminLiveSectionProps } from '@/types/live-admin.types';

/** The policy editor: minutes and dollars here, seconds and micro-USD on the wire. */
export function AdminLivePolicyForm({ controller }: AdminLiveSectionProps): React.ReactElement {
  const { t, form, activePolicy: policy } = controller;
  const values = form.values;
  if (controller.isPolicyLoading) {
    return <p className="text-muted-foreground text-sm">{t('live.admin.loading')}</p>;
  }
  if (controller.isPolicyError || values === null || policy === null) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {t('live.admin.error')}
      </p>
    );
  }
  return (
    <section
      aria-labelledby="admin-live-policy"
      className="flex flex-col gap-4"
      data-testid="admin-live-policy"
    >
      <div className="flex flex-col gap-1">
        <h2 id="admin-live-policy" className="text-foreground text-base font-semibold">
          {t('live.admin.policyTitle')} ·{' '}
          {t('live.admin.versionLabel', { version: policy.version })}
        </h2>
        <p className="text-muted-foreground text-sm">{t('live.admin.policyDescription')}</p>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="text-foreground flex items-center gap-2 text-sm">
          <Switch
            checked={values.featureEnabled}
            onCheckedChange={(checked) => form.setFlag(LivePolicyFlag.FEATURE_ENABLED, checked)}
          />
          {t('live.admin.featureEnabled')}
        </label>
        <label className="text-foreground flex items-center gap-2 text-sm">
          <Switch
            checked={values.killSwitch}
            onCheckedChange={(checked) => form.setFlag(LivePolicyFlag.KILL_SWITCH, checked)}
          />
          {t('live.admin.killSwitch')}
        </label>
      </div>
      <fieldset className="border-border flex flex-col gap-2 rounded-lg border p-3">
        <legend className="text-foreground px-1 text-sm font-semibold">
          {t('live.admin.serverPullTitle')}
        </legend>
        <p className="text-muted-foreground text-xs">{t('live.admin.serverPullHint')}</p>
        <label className="text-foreground flex items-center gap-2 text-sm">
          <Switch
            checked={values.serverPull}
            onCheckedChange={(checked) => form.setFlag(LivePolicyFlag.SERVER_PULL, checked)}
            data-testid="admin-live-server-pull"
          />
          {t('live.admin.serverPullSwitch')}
        </label>
      </fieldset>
      <fieldset className="border-border flex flex-col gap-3 rounded-lg border p-3">
        <legend className="text-foreground px-1 text-sm font-semibold">
          {t('live.admin.plansTitle')}
        </legend>
        {values.plans.map((row) => (
          <AdminLivePlanRow
            key={row.plan}
            row={row}
            label={row.plan}
            invalidField={form.invalidField}
            t={t}
            onChange={form.setPlan}
          />
        ))}
        <AdminLivePlanRow
          row={values.defaultPlan}
          label={t('live.admin.defaultPlan')}
          invalidField={form.invalidField}
          t={t}
          onChange={form.setPlan}
        />
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LIVE_POLICY_NUMBER_FIELDS.map((entry) => (
          <AdminLiveNumberField
            key={entry.field}
            id={`admin-live-${entry.field}`}
            label={t(entry.labelKey)}
            value={values[entry.field]}
            invalid={form.invalidField === entry.field}
            onChange={(value) => form.setNumber(entry.field, value)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3" data-testid="admin-live-model-chains">
        <div className="flex flex-col gap-1">
          <p className="text-foreground text-sm font-medium">{t('live.admin.modelChains')}</p>
          <p className="text-muted-foreground text-xs">{t('live.admin.modelChainsHint')}</p>
        </div>
        {LIVE_MODEL_CHAIN_EDITORS.map((editor) => (
          <AdminLiveModelChain
            key={editor.kind}
            editor={editor}
            chain={values.modelChains[editor.kind]}
            groups={controller.modelGroups}
            isLoading={controller.isModelsLoading}
            invalid={form.invalidField === editor.kind}
            t={t}
            actions={form.chainActions}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-live-note" className="text-foreground text-sm font-medium">
          {t('live.admin.note')}
        </label>
        <Textarea
          id="admin-live-note"
          name="admin-live-note"
          value={values.note}
          placeholder={t('live.admin.notePlaceholder')}
          onChange={(event) => form.setNote(event.target.value)}
        />
      </div>
      {form.invalidField ? (
        <p role="alert" className="text-destructive text-sm">
          {t('live.admin.invalidField')}
        </p>
      ) : null}
      <Button onClick={controller.save} isLoading={controller.isSaving} className="self-start">
        {t('live.admin.save')}
      </Button>
    </section>
  );
}
