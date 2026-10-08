import { usePathname } from 'next/navigation';

import { TOUR_DEFINITIONS } from '@/constants/tours.constants';
import type { TourId } from '@/enums/tour-id.enum';
import { useTourContent } from '@/hooks/tour/use-tour-content';
import { useTourStore } from '@/stores/tour.store';
import type { TourLauncherController, TourLauncherEntry } from '@/types/tour.types';
import { stripLocaleFromPathname } from '@/utilities/locale.utility';
import { tourAppliesToPath } from '@/utilities/tour-route.utility';

/**
 * The tours a person can start from the help button: this page's only. A tour of another page
 * would spotlight things that are not on screen, so it is not offered here.
 */
export function useTourLauncher(): TourLauncherController {
  const pathname = usePathname();
  const path = stripLocaleFromPathname(pathname ?? '/');
  const content = useTourContent();
  const completed = useTourStore((state) => state.progress.completed);
  const start = useTourStore((state) => state.start);
  const offersDisabled = useTourStore((state) => state.progress.offersDisabled);
  const setOffersDisabled = useTourStore((state) => state.setOffersDisabled);

  const here: TourLauncherEntry[] = TOUR_DEFINITIONS.filter((tour) =>
    tourAppliesToPath(tour, path),
  ).map((tour) => ({
    id: tour.id,
    title: content.tours[tour.id].title,
    description: content.tours[tour.id].description,
    isCompleted: completed[tour.id] === true,
  }));

  return {
    here,
    offersDisabled,
    setOffersDisabled,
    start: (tourId: TourId) => start(tourId),
  };
}
