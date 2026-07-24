'use client';

import { useAdUnit } from '@/hooks/adsense/use-ad-unit';
import { cn } from '@/lib/utils';
import type { AdUnitProps } from '@/types/adsense.types';

// A single manual AdSense placement. Renders nothing at all unless every gate
// passes (configured + serving enabled + ad-eligible reviewed page + consent).
// The reserved height keeps the slot from causing layout shift, and the
// "Advertisement" label keeps ad content visually distinct from product UI.
export function AdUnit({
  slot,
  reservedHeight,
  pathname,
  className,
}: AdUnitProps): React.ReactElement | null {
  const { shouldRender, clientId, insRef } = useAdUnit(pathname);

  if (!shouldRender || clientId === null) {
    return null;
  }

  return (
    <aside
      className={cn('mx-auto w-full max-w-3xl', className)}
      style={{ minHeight: reservedHeight }}
      aria-label="Advertisement"
    >
      <p className="text-muted-foreground mb-1 text-center text-[10px] tracking-wide uppercase">
        Advertisement
      </p>
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: reservedHeight }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
