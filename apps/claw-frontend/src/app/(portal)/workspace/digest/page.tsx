'use client';

import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { DigestSectionCard } from '@/components/digest/digest-section-card';
import { Button } from '@/components/ui/button';
import { DigestScope } from '@/enums/digest-scope.enum';
import { useDigestPage } from '@/hooks/digest/use-digest-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceDigestPage(): ReactElement {
  const { t } = useTranslation();
  const { today, history, preference, isLoading, isError, error, isTriggering, trigger } =
    useDigestPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('digest.page.title')} description={t('digest.page.description')} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => trigger(DigestScope.DAILY)}
          disabled={isTriggering}
          variant="default"
        >
          {isTriggering ? t('digest.page.triggering') : t('digest.page.triggerDaily')}
        </Button>
        <Button
          type="button"
          onClick={() => trigger(DigestScope.WEEKLY)}
          disabled={isTriggering}
          variant="outline"
        >
          {t('digest.page.triggerWeekly')}
        </Button>
        {preference !== null ? (
          <span className="text-muted-foreground ml-auto text-xs">
            {t('digest.page.preferenceHint', {
              hour: String(preference.dailyHourLocal),
              tz: preference.timezone,
            })}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('digest.page.loading')}</p>
      ) : null}

      {isError ? (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
          {error?.message ?? t('digest.page.error')}
        </p>
      ) : null}

      {!isLoading && (today === null || today === undefined) ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-center text-sm">
          {t('digest.page.noTodayDigest')}
        </p>
      ) : null}

      {today !== null && today !== undefined ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('digest.page.today')}</h2>
          {today.generatedAt !== undefined && today.generatedAt !== null ? (
            <span className="text-muted-foreground text-xs">
              {t('digest.page.generatedAt', {
                ts: new Date(today.generatedAt).toLocaleString(),
              })}
            </span>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(today.sections ?? []).map((section) => (
              <DigestSectionCard key={section.provider} section={section} t={t} />
            ))}
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('digest.page.history')}</h2>
          <ul className="space-y-1 text-sm">
            {history.slice(0, 14).map((h) => (
              <li
                key={h.id}
                className="border-border flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span>{h.snapshotDate}</span>
                <span className="text-muted-foreground text-xs">
                  {t('digest.page.sectionsCount', {
                    n: String((h.sections ?? []).length),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
