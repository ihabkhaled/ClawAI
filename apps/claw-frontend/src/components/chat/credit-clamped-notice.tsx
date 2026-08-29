'use client';

import { Scissors, X } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { CREDIT_TOPUP_QUERY_KEY, CREDIT_TOPUP_QUERY_VALUE } from '@/constants/credit.constants';
import { useCreditClampedNotice } from '@/hooks/credit/use-credit-clamped-notice';
import type { CreditClampedNoticeProps } from '@/types/credit-component.types';

/**
 * "This answer was shortened to fit your balance."
 *
 * chat-service clamps `maxOutputTokens` to what the wallet can pay for BEFORE
 * calling the provider, so a user can never overspend — but the cost of that
 * guarantee is a reply that stops early, and an unexplained short reply reads as
 * the model being bad rather than the wallet being nearly empty. Degrading
 * silently would make the product look broken to protect a number the user
 * cannot see.
 *
 * Dismissible, because it is about one answer and must not become permanent
 * furniture in a long thread.
 */
export function CreditClampedNotice({ t }: CreditClampedNoticeProps): ReactElement | null {
  const { isVisible, dismiss } = useCreditClampedNotice();

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="credit-clamped-notice"
      className="border-warning/40 bg-warning-surface text-warning flex w-full items-start gap-2 rounded-md border px-3 py-2 text-xs"
    >
      <Scissors className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold">{t('chat.credit.clampedTitle')}</span>
        <span className="text-warning/90">{t('chat.credit.clampedBody')}</span>
        <Link
          href={`${ROUTES.PLAN}?${CREDIT_TOPUP_QUERY_KEY}=${CREDIT_TOPUP_QUERY_VALUE}`}
          className="text-primary self-start underline underline-offset-2"
        >
          {t('chat.credit.addCreditCta')}
        </Link>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0"
        onClick={dismiss}
        aria-label={t('chat.credit.clampedDismiss')}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
