'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { TrialStatus } from '@/enums/trial-status.enum';
import { useTrialStatusBanner } from '@/hooks/layout/use-trial-status-banner';

export function TrialStatusBanner(): React.ReactElement | null {
  const banner = useTrialStatusBanner();
  if (banner.status === TrialStatus.HIDDEN) {
    return null;
  }

  return (
    <section
      className="border-border bg-card flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3 sm:px-6"
      role={banner.status === TrialStatus.EXPIRED ? 'alert' : 'status'}
    >
      <div>
        <p className="font-semibold">{banner.title}</p>
        <p className="text-muted-foreground text-sm">{banner.body}</p>
      </div>
      <Button asChild size="sm">
        <Link href={banner.upgradeHref}>{banner.upgradeLabel}</Link>
      </Button>
    </section>
  );
}
