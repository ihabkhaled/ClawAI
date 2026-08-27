'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { ChatLimitNoticeCardProps } from '@/types/component.types';

/**
 * The limit refusal, as a line in the conversation rather than a toast.
 *
 * A toast is the wrong shape for this: it disappears after a few seconds, so
 * somebody who stepped away comes back to a composer that silently did nothing.
 * The refusal is part of what happened in this thread, so it stays visible until
 * the next successful send.
 */
export function ChatLimitNoticeCard({ notice }: ChatLimitNoticeCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section
      role="status"
      aria-live="polite"
      className="border-warning/40 bg-warning/5 mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-lg border border-dashed p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t(notice.titleKey)}</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{t(notice.bodyKey)}</p>
        </div>
      </div>
      {notice.showUpgrade ? (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={ROUTES.PLAN}>{t('chat.limits.upgradeCta')}</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
