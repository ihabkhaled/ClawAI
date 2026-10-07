import { usePathname } from 'next/navigation';

import { TOUR_DEFINITIONS } from '@/constants/tours.constants';
import type { TourId } from '@/enums/tour-id.enum';
import { useTourContent } from '@/hooks/tour/use-tour-content';
import { useTourStore } from '@/stores/tour.store';
import type { TourLauncherController, TourLauncherEntry } from '@/types/tour.types';
import { stripLocaleFromPathname } from '@/utilities/locale.utility';
import { tourAppliesToPath } from '@/utilities/tour-route.utility';

/** The tours a person can start from the help button: this page's first, then the rest. */
export function useTourLauncher(): TourLauncherController {
  const pathname = usePathname();
  const path = stripLocaleFromPathname(pathname);
  const content = useTourContent();
  const completed = useTourStore((state) => state.progress.completed);
  const start = useTourStore((state) => state.start);

  const entries: TourLauncherEntry[] = TOUR_DEFINITIONS.map((tour) => ({
    id: tour.id,
    title: content.tours[tour.id].title,
    description: content.tours[tour.id].description,
    isCompleted: completed[tour.id] === true,
    isHere: tourAppliesToPath(tour, path),
  }));

  return {
    here: entries.filter((entry) => entry.isHere),
    more: entries.filter((entry) => !entry.isHere),
    start: (tourId: TourId) => start(tourId),
  };
}
