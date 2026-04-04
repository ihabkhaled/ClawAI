'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROUTES } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';

export function useAuthGuard(): { isReady: boolean } {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist to hydrate from localStorage
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (happens on client-side navigation, not refresh)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  // Only redirect after hydration is complete
  useEffect(() => {
    if (hydrated && (!isAuthenticated || !accessToken)) {
      router.replace(ROUTES.LOGIN);
    }
  }, [hydrated, isAuthenticated, accessToken, router]);

  return { isReady: hydrated && isAuthenticated && !!accessToken };
}
