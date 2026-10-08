import type { TourProgress } from '@/types/tour.types';

export const EMPTY_TOUR_PROGRESS: TourProgress = {
  completed: {},
  dismissedOffers: {},
  offersDisabled: false,
};

function onlyTrueFlags(value: unknown): Record<string, true> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const flags: Record<string, true> = {};
  for (const [key, flag] of Object.entries(value)) {
    if (flag === true) {
      flags[key] = true;
    }
  }
  return flags;
}

/** What this browser remembers for a key. Blocked or corrupt storage reads as "nothing yet". */
export function readTourProgress(storageKey: string): TourProgress {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) {
      return EMPTY_TOUR_PROGRESS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return EMPTY_TOUR_PROGRESS;
    }
    const record = parsed as Record<string, unknown>;
    return {
      completed: onlyTrueFlags(record['completed']),
      dismissedOffers: onlyTrueFlags(record['dismissedOffers']),
      offersDisabled: record['offersDisabled'] === true,
    };
  } catch {
    return EMPTY_TOUR_PROGRESS;
  }
}

/** Remembers progress. A blocked write is ignored: the tour still works for this visit. */
export function writeTourProgress(storageKey: string, progress: TourProgress): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Private windows and blocked storage: the tour is simply offered again next time.
  }
}

let currentStorageKey: string | null = null;

/** Sets which account's progress `rememberTourProgress` writes to. */
export function setTourStorageKey(storageKey: string): void {
  currentStorageKey = storageKey;
}

/** Writes progress for the current account, if one is set. */
export function rememberTourProgress(progress: TourProgress): void {
  if (currentStorageKey !== null) {
    writeTourProgress(currentStorageKey, progress);
  }
}
