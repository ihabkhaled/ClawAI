import { useEffect } from 'react';

import { TOUR_STORAGE_KEY_PREFIX } from '@/constants/tour.constants';
import { useAuthStore } from '@/stores/auth.store';
import { useTourStore } from '@/stores/tour.store';

/**
 * Loads what this account has already seen, once the account is known and again if another
 * account signs in on the same browser. The key carries the account id so two people sharing a
 * browser do not share a tour history.
 */
export function useTourProgressSync(): void {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const hydrate = useTourStore((state) => state.hydrate);

  useEffect(() => {
    if (userId !== null) {
      hydrate(`${TOUR_STORAGE_KEY_PREFIX}:${userId}`);
    }
  }, [userId, hydrate]);
}
