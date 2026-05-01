'use client';

import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { ImplHandoffStatus } from '@/enums/impl-handoff-status.enum';
import { useImplHandoffsPage } from '@/hooks/impl-handoff/use-impl-handoffs-page';
import { useTranslation } from '@/lib/i18n';

export default function ImplHandoffsPage(): ReactElement {
  const { t } = useTranslation();
  const { handoffs, isLoading, isError, error } = useImplHandoffsPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('implHandoff.page.title')}
        description={t('implHandoff.page.description')}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('implHandoff.page.loading')}</p>
      ) : null}

      {isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error?.message ?? t('implHandoff.page.error')}
        </p>
      ) : null}

      {!isLoading && !isError && handoffs.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('implHandoff.page.empty')}
        </p>
      ) : null}

      {handoffs.length > 0 ? (
        <div className="flex flex-col gap-2">
          {handoffs.map((handoff) => {
            let statusStyle =
              'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400';
            if (handoff.status === ImplHandoffStatus.DELIVERED) {
              statusStyle =
                'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            } else if (handoff.status === ImplHandoffStatus.FAILED) {
              statusStyle = 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400';
            }
            return (
              <div
                key={handoff.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold">
                    {handoff.mode}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle}`}
                  >
                    {handoff.status}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(handoff.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">{handoff.briefSnippet}</p>
                {handoff.targetThreadId !== null ? (
                  <a
                    className="text-xs text-primary hover:underline"
                    href={`/chat/${handoff.targetThreadId}`}
                  >
                    {t('implHandoff.page.openThread')}
                  </a>
                ) : null}
                {handoff.errorMessage !== null ? (
                  <p className="text-xs text-destructive">{handoff.errorMessage}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
