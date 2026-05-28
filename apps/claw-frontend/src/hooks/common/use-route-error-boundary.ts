import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { RouteErrorBoundaryProps, RouteErrorBoundaryView } from '@/types';
import { logger } from '@/utilities/logger.utility';

// Drives a route-level error boundary. Two responsibilities:
//  1. Log the caught error once (to the client-logs pipeline).
//  2. Auto-reset when the user navigates to a DIFFERENT route, so a crashed
//     page never poisons the next page (the bug: error persisted until a full
//     browser refresh). We capture the pathname at mount; when it changes we
//     call Next's reset() to re-render the segment subtree cleanly.
export function useRouteErrorBoundary({
  error,
  reset,
}: RouteErrorBoundaryProps): RouteErrorBoundaryView {
  const { t } = useTranslation();
  const pathname = usePathname();
  const initialPathname = useRef(pathname);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (loggedRef.current) {
      return;
    }
    loggedRef.current = true;
    logger.error({
      component: 'RouteErrorBoundary',
      action: 'route_error',
      message: error.message,
      details: { digest: error.digest, pathname: initialPathname.current },
    });
  }, [error]);

  useEffect(() => {
    if (pathname !== initialPathname.current) {
      reset();
    }
  }, [pathname, reset]);

  return {
    title: t('common.errorBoundaryTitle'),
    description: t('common.errorBoundaryDescription'),
    retryLabel: t('common.retry'),
    onRetry: reset,
  };
}
