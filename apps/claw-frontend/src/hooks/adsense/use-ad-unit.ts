'use client';

import { useEffect, useRef } from 'react';

import { getAdSenseConfig } from '@/lib/adsense/adsense-config';
import { hasAdvertisingConsent } from '@/lib/adsense/adsense-consent';
import { isAdUnitEligible } from '@/lib/adsense/adsense-eligibility';
import type { UseAdUnitReturn } from '@/types/adsense-hook.types';
import { logger } from '@/utilities';

// A manual ad unit renders ONLY when: the client id is configured, serving is
// explicitly enabled, the path is an ad-eligible reviewed editorial page, and
// advertising consent is present. Any single failure => nothing renders and no
// ad request is made.
export function useAdUnit(pathname: string): UseAdUnitReturn {
  const insRef = useRef<HTMLModElement | null>(null);
  const config = getAdSenseConfig();

  const shouldRender =
    config.isConfigured &&
    config.servingEnabled &&
    isAdUnitEligible(pathname) &&
    hasAdvertisingConsent();

  useEffect(() => {
    if (!shouldRender || insRef.current === null) {
      return;
    }
    try {
      const win = window as unknown as { adsbygoogle?: unknown[] };
      win.adsbygoogle = win.adsbygoogle ?? [];
      win.adsbygoogle.push({});
    } catch (error) {
      logger.error({
        component: 'adsense',
        action: 'push-ad',
        message: 'Failed to request AdSense unit',
        details: { error: (error as Error).message },
      });
    }
  }, [shouldRender]);

  return { shouldRender, clientId: config.clientId, insRef };
}
