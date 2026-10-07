import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TOUR_OFFER_DELAY_MS } from '@/constants/tour.constants';
import { TOUR_DEFINITIONS } from '@/constants/tours.constants';
import { useTourStore } from '@/stores/tour.store';
import type { TourDefinition, TourOfferController } from '@/types/tour.types';
import { stripLocaleFromPathname } from '@/utilities/locale.utility';
import { tourAppliesToPath } from '@/utilities/tour-route.utility';

/**
 * Offers the first tour of the page a person has not seen, a moment after they arrive. It is an
 * offer, never an interruption: it never starts by itself, and "Not now" is remembered.
 */
export function useTourOffer(): TourOfferController {
  const pathname = usePathname();
  const path = stripLocaleFromPathname(pathname);
  const activeTourId = useTourStore((state) => state.activeTourId);
  const progress = useTourStore((state) => state.progress);
  const start = useTourStore((state) => state.start);
  const dismissOffer = useTourStore((state) => state.dismissOffer);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    const timer = window.setTimeout(() => setIsReady(true), TOUR_OFFER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [path]);

  const candidate: TourDefinition | undefined = TOUR_DEFINITIONS.find(
    (tour) =>
      tour.autoOffer &&
      tourAppliesToPath(tour, path) &&
      progress.completed[tour.id] !== true &&
      progress.dismissedOffers[tour.id] !== true,
  );

  const offered = isReady && activeTourId === null && candidate !== undefined ? candidate : null;
  return {
    offeredTourId: offered?.id ?? null,
    accept: () => {
      if (offered !== null) {
        start(offered.id);
      }
    },
    decline: () => {
      if (offered !== null) {
        dismissOffer(offered.id);
      }
    },
  };
}
