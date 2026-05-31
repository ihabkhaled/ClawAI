import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PLAN_FEATURE_LABEL_KEYS, ROUTES } from '@/constants';
import type { UpgradeCtaBannerProps } from '@/types';

export function UpgradeCtaBanner({
  feature,
  onDismiss,
  t,
}: UpgradeCtaBannerProps): React.ReactElement {
  const featureLabel = t(PLAN_FEATURE_LABEL_KEYS[feature]);

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t('chat.upgrade.title', { feature: featureLabel })}
            </p>
            <p className="text-sm text-muted-foreground">{t('chat.upgrade.body')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="me-1.5 h-3.5 w-3.5" aria-hidden />
            {t('chat.upgrade.dismiss')}
          </Button>
          <Button asChild size="sm">
            <Link href={ROUTES.PLAN}>{t('chat.upgrade.cta')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
