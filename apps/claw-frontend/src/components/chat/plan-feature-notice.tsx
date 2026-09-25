'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PLAN_FEATURE_LABEL_KEYS, ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { PlanFeatureNoticeProps } from '@/types';

/**
 * The reply when a turn needed a media feature the plan does not include
 * (ADR-122): shown in the transcript, translated, with the way to upgrade. It
 * replaces the English fallback text chat-service stores on the message.
 */
export function PlanFeatureNotice({ feature }: PlanFeatureNoticeProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <section
      role="status"
      className="border-warning/40 bg-warning/5 flex flex-col gap-3 rounded-lg border border-dashed p-4"
      data-testid="plan-feature-notice"
    >
      <div className="flex items-start gap-3">
        <Lock className="text-warning mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {t('chat.upgrade.title', { feature: t(PLAN_FEATURE_LABEL_KEYS[feature]) })}
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {t('chat.limits.featureDisabledBody')}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link href={ROUTES.PLAN}>{t('chat.limits.upgradeCta')}</Link>
        </Button>
      </div>
    </section>
  );
}
