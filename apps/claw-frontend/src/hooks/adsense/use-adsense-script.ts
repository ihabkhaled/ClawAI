'use client';

import { usePathname } from 'next/navigation';

import { getAdSenseConfig } from '@/lib/adsense/adsense-config';
import { shouldLoadAdSenseScript } from '@/lib/adsense/adsense-eligibility';
import type { UseAdSenseScriptReturn } from '@/types/adsense-hook.types';

export function useAdSenseScript(): UseAdSenseScriptReturn {
  const pathname = usePathname();
  const config = getAdSenseConfig();

  const shouldLoad = shouldLoadAdSenseScript({
    isConfigured: config.isConfigured,
    reviewMode: config.reviewMode,
    servingEnabled: config.servingEnabled,
    pathname: pathname ?? '',
  });

  return { shouldLoad, clientId: config.clientId };
}
