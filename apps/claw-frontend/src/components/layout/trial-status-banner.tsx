'use client';

import Link from 'next/link';

import { TrialBannerDismissMenu } from '@/components/layout/trial-banner-dismiss-menu';
import { Button } from '@/components/ui/button';
import { TrialStatus } from '@/enums/trial-status.enum';
import { useTrialBannerDismissal } from '@/hooks/layout/use-trial-banner-dismissal';
import { useTrialStatusBanner } from '@/hooks/layout/use-trial-status-banner';

export function TrialStatusBanner(): React.ReactElement | null {
  const banner = useTrialStatusBanner();
  const isActive = banner.status === TrialStatus.ACTIVE;
  const dismissal = useTrialBannerDismissal(isActive ? banner.daysRemaining : null);
  if (banner.status === TrialStatus.HIDDEN || dismissal.isSuppressed) {
    return null;
  }

  return (
    <section
      className="border-border bg-card flex items-center gap-2 border-b px-3 py-1.5 sm:gap-3 sm:px-6 sm:py-3"
      role={banner.status === TrialStatus.EXPIRED ? 'alert' : 'status'}
      data-testid="trial-status-banner"
    >
      <div className="min-w-0 flex-1">
        <p className="sr-only font-semibold sm:not-sr-only">{banner.title}</p>
        <p className="text-muted-foreground text-xs sm:text-sm">{banner.body}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={banner.upgradeHref}>{banner.upgradeLabel}</Link>
      </Button>
      {isActive ? <TrialBannerDismissMenu onDismiss={dismissal.dismiss} /> : null}
    </section>
  );
}
