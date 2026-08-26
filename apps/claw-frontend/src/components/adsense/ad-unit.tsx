'use client';

import { useAdUnit } from '@/hooks/adsense/use-ad-unit';
import { cn } from '@/lib/utils';
import type { AdUnitProps } from '@/types/adsense.types';

// A single manual AdSense placement. Renders nothing at all unless every gate
// passes (configured + serving enabled + eligible placement + consent), and
// nothing when the slot id itself is missing or malformed — a unit with no slot
// would request an ad against an id that does not exist.
//
// `serverEligibility` carries a trusted verdict for dynamic pages; see useAdUnit.
// It is threaded through rather than derived here so the component stays a pure
// render and the decision has exactly one home.
//
// The reserved height keeps the slot from causing layout shift, and the
// "Advertisement" label keeps ad content visually and programmatically distinct
// from the surrounding content — on a shared chat page that distinction is the
// difference between an ad and something that reads as model output.
export function AdUnit({
  slot,
  reservedHeight,
  pathname,
  serverEligibility,
  className,
  label,
}: AdUnitProps): React.ReactElement | null {
  const { shouldRender, clientId, insRef } = useAdUnit(pathname, serverEligibility);

  if (!shouldRender || clientId === null || slot === null) {
    return null;
  }

  return (
    <aside
      className={cn('mx-auto w-full max-w-3xl', className)}
      style={{ minHeight: reservedHeight }}
      aria-label={label}
    >
      <p className="text-muted-foreground touch:text-xs mb-1 text-center text-[10px] tracking-wide uppercase">
        {label}
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
