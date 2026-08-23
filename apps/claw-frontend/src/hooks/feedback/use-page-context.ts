import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { FeedbackPageContext } from '@/types';

// Collects only what is needed to reproduce a report. It NEVER reads cookies,
// localStorage, sessionStorage, tokens or any Authorization header.
export function usePageContext(): () => FeedbackPageContext {
  const pathname = usePathname();
  const { locale } = useTranslation();

  return useCallback((): FeedbackPageContext => {
    if (typeof window === 'undefined') {
      return { route: pathname, locale };
    }
    return {
      route: pathname,
      url: window.location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
      userAgent: window.navigator.userAgent,
      locale,
    };
  }, [locale, pathname]);
}
