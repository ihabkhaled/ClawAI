'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { CreditDualConsumptionNotice } from '@/components/billing/credit-dual-consumption-notice';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { CREDIT_TOPUP_QUERY_KEY, CREDIT_TOPUP_QUERY_VALUE } from '@/constants/credit.constants';
import { ChatLimitAction } from '@/enums/chat-limit-action.enum';
import { useTranslation } from '@/lib/i18n';
import type { ChatLimitNoticeCardProps } from '@/types/component.types';

/**
 * The limit refusal, as a line in the conversation rather than a toast.
 *
 * A toast is the wrong shape for this: it disappears after a few seconds, so
 * somebody who stepped away comes back to a composer that silently did nothing.
 * The refusal is part of what happened in this thread, so it stays visible until
 * the next successful send.
 *
 * The action is chosen per refusal, not hardcoded. "Upgrade" was already a
 * stretch for a daily ceiling; for an empty wallet it would offer somebody the
 * plan they are already on, and for a pricing outage on OUR side it would sell a
 * fix for our own problem. `ChatLimitAction.None` renders no button at all.
 */
export function ChatLimitNoticeCard({ notice }: ChatLimitNoticeCardProps): React.ReactElement {
  const { t } = useTranslation();
  const isAddCredit = notice.action === ChatLimitAction.AddCredit;

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

      {notice.showCreditDisclaimer ? <CreditDualConsumptionNotice t={t} /> : null}

      {notice.action === ChatLimitAction.None ? null : (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link
              href={
                isAddCredit
                  ? `${ROUTES.PLAN}?${CREDIT_TOPUP_QUERY_KEY}=${CREDIT_TOPUP_QUERY_VALUE}`
                  : ROUTES.PLAN
              }
            >
              {isAddCredit ? t('chat.limits.addCreditCta') : t('chat.limits.upgradeCta')}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
