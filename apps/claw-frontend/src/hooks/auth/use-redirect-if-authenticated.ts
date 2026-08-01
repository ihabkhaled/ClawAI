'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/auth.store';
import type { UseRedirectIfAuthenticatedReturn } from '@/types/hook.types';
import { logger } from '@/utilities';
import { safeReturnRoute } from '@/utilities/safe-return-route.utility';

// Mirror image of useAuthGuard: on the PUBLIC auth pages (login/register), an
// already-authenticated visitor should be sent into the app rather than shown
// the form again. Waits for Zustand persist to hydrate from localStorage
// before deciding, so a genuine logged-in session (restored on hard refresh)
// is respected. Redirects to ROUTES.CHAT — the same destination a successful
// login uses and the one authenticated landing every role can reach
// (/dashboard is permission-gated, so it is not safe as a universal target).
export function useRedirectIfAuthenticated(): UseRedirectIfAuthenticatedReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  const isAuthed = isAuthenticated && Boolean(accessToken);

  useEffect(() => {
    if (hydrated && isAuthed) {
      logger.info({
        component: 'auth',
        action: 'auth-page-redirect',
        message: 'Authenticated user redirected away from auth page',
      });
      router.replace(safeReturnRoute(searchParams.get('returnTo')));
    }
  }, [hydrated, isAuthed, router, searchParams]);

  return { shouldRenderAuthPage: hydrated && !isAuthed };
}
