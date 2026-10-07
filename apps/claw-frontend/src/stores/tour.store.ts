import { create } from 'zustand';

import type { TourId } from '@/enums/tour-id.enum';
import type { TourProgress, TourStore } from '@/types/tour.types';
import {
  EMPTY_TOUR_PROGRESS,
  readTourProgress,
  rememberTourProgress,
  setTourStorageKey,
} from '@/utilities/tour-storage.utility';

/**
 * Which tour is running, on which step, and what this person has already seen.
 *
 * Progress is remembered in this browser, per account, because a tour is a convenience and not
 * data worth a database row. A person who clears their browser data simply sees the offers again.
 */
export const useTourStore = create<TourStore>()((set, get) => ({
  activeTourId: null,
  stepIndex: 0,
  progress: EMPTY_TOUR_PROGRESS,
  hydrate: (storageKey) => {
    setTourStorageKey(storageKey);
    set({ progress: readTourProgress(storageKey) });
  },
  start: (tourId: TourId) => set({ activeTourId: tourId, stepIndex: 0 }),
  next: (totalSteps) =>
    set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, Math.max(totalSteps - 1, 0)) })),
  back: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
  finish: () => {
    const { activeTourId, progress } = get();
    if (activeTourId === null) {
      return;
    }
    const next: TourProgress = {
      ...progress,
      completed: { ...progress.completed, [activeTourId]: true },
    };
    set({ activeTourId: null, stepIndex: 0, progress: next });
    rememberTourProgress(next);
  },
  skip: () => {
    const { activeTourId, progress } = get();
    if (activeTourId === null) {
      return;
    }
    // Leaving a tour early also counts as having seen the offer, so it is not pushed again.
    const next: TourProgress = {
      ...progress,
      dismissedOffers: { ...progress.dismissedOffers, [activeTourId]: true },
    };
    set({ activeTourId: null, stepIndex: 0, progress: next });
    rememberTourProgress(next);
  },
  dismissOffer: (tourId) => {
    const { progress } = get();
    const next: TourProgress = {
      ...progress,
      dismissedOffers: { ...progress.dismissedOffers, [tourId]: true },
    };
    set({ progress: next });
    rememberTourProgress(next);
  },
}));
