import Link from 'next/link';
import type { ReactElement } from 'react';

import { ThreadModelPicker } from '@/components/threads/thread-model-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ROUTES } from '@/constants/routes.constants';
import {
  THREAD_GENERATION_ROLE_KEYS,
  THREAD_PUBLICATION_OPTIONS,
} from '@/constants/thread-publication.constants';
import type { Locale } from '@/enums/locale.enum';
import { useTranslation } from '@/lib/i18n';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import type { ThreadPublicationType } from '@/types';
import type { ThreadGenerationFormController } from '@/types/thread-publication.types';

export function ThreadGenerationForm({
  form,
}: {
  form: ThreadGenerationFormController;
}): ReactElement {
  const { t } = useTranslation();

  function roleLabel(index: number): string {
    if (index < 3) {
      return `${t('chat.threadAuthorModel')} ${index + 1}`;
    }
    return index === 3 ? t('chat.threadJudgeModel') : t('chat.threadCriticModel');
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={form.submit}>
      <p className="bg-muted/30 rounded-md p-3 text-sm" role="note">
        {t('chat.threadPublicIntentDisclosure')}
      </p>
      {form.fixedSourceThreadId === null ? (
        <label className="flex flex-col gap-1 text-sm">
          {t('chat.threadSourceChat')}
          <select
            required
            value={form.sourceThreadId}
            onChange={(event) => form.setSourceThreadId(event.target.value)}
            className="border-input bg-background rounded-md border px-3 py-2"
          >
            <option value="">
              {form.isLoadingThreads ? t('chat.loadingThreads') : t('chat.threadChooseChat')}
            </option>
            {form.threads.map((thread) => (
              <option key={thread.id} value={thread.id}>
                {thread.title ?? t('chat.untitled')}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        {t('chat.threadTopic')}
        <textarea
          required
          minLength={10}
          maxLength={10000}
          value={form.topic}
          onChange={(event) => form.setTopic(event.target.value)}
          className="border-input bg-background min-h-24 rounded-md border px-3 py-2"
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t('chat.threadPublicationType')}
          <select
            value={form.publicationType}
            onChange={(event) =>
              form.setPublicationType(event.target.value as ThreadPublicationType)
            }
            className="border-input bg-background rounded-md border px-3 py-2"
          >
            {THREAD_PUBLICATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.translationKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('chat.threadContentLocale')}
          <select
            value={form.contentLocale}
            onChange={(event) => form.setContentLocale(event.target.value as Locale)}
            className="border-input bg-background rounded-md border px-3 py-2"
            aria-describedby="thread-content-locale-help"
          >
            {SUPPORTED_LOCALES.map(({ locale: supportedLocale, label }) => (
              <option key={supportedLocale} value={supportedLocale}>
                {label}
              </option>
            ))}
          </select>
          <span id="thread-content-locale-help" className="text-muted-foreground text-xs">
            {t('chat.threadContentLocaleHelp')}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('chat.threadSpendCapUsd')}
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.spendCapUsd}
            onChange={(event) => form.setSpendCapUsd(event.target.value)}
            className="border-input bg-background rounded-md border px-3 py-2"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {form.selectedModels.map((model, index) => (
          <ThreadModelPicker
            key={THREAD_GENERATION_ROLE_KEYS[index]}
            id={`thread-role-${THREAD_GENERATION_ROLE_KEYS[index] ?? String(index)}`}
            label={roleLabel(index)}
            value={model}
            onChange={(selected) => form.changeModel(index, selected)}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <Checkbox
          checked={form.hasAcknowledgedPublic}
          onCheckedChange={(checked) => form.setHasAcknowledgedPublic(checked === true)}
          className="mt-0.5"
        />
        <span>{t('chat.threadConsentCheckbox')}</span>
      </label>
      {form.isPlanBlocked ? (
        <p
          role="alert"
          className="border-warning/40 bg-warning-surface text-warning rounded-md border p-3 text-sm"
        >
          {t('chat.threadPlanRequired')}{' '}
          <Link href={ROUTES.PLAN} className="underline">
            {t('trialStatus.upgrade')}
          </Link>
        </p>
      ) : null}
      {form.hasError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
      <Button
        type="submit"
        disabled={
          form.isStarting ||
          form.isLoadingModels ||
          form.availableModels.length === 0 ||
          !form.hasAcknowledgedPublic
        }
        className="w-fit"
        isLoading={form.isStarting}
      >
        {form.isStarting ? t('common.loading') : t('chat.threadStartGeneration')}
      </Button>
    </form>
  );
}
