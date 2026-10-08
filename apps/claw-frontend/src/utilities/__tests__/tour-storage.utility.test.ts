import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EMPTY_TOUR_PROGRESS,
  readTourProgress,
  writeTourProgress,
} from '@/utilities/tour-storage.utility';

const KEY = 'claw.tours.v1:test';

describe('tour progress storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('reads nothing when empty', () => {
    expect(readTourProgress(KEY)).toEqual(EMPTY_TOUR_PROGRESS);
  });

  it('round-trips progress', () => {
    writeTourProgress(KEY, {
      completed: { a: true },
      dismissedOffers: { b: true },
      offersDisabled: true,
    });
    expect(readTourProgress(KEY)).toEqual({
      completed: { a: true },
      dismissedOffers: { b: true },
      offersDisabled: true,
    });
  });

  it('treats corrupt or wrong-shaped data as nothing', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(readTourProgress(KEY)).toEqual(EMPTY_TOUR_PROGRESS);
    window.localStorage.setItem(KEY, '"text"');
    expect(readTourProgress(KEY)).toEqual(EMPTY_TOUR_PROGRESS);
  });

  it('reads offersDisabled only when it is exactly true', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ offersDisabled: 'yes' }));
    expect(readTourProgress(KEY).offersDisabled).toBe(false);
    window.localStorage.setItem(KEY, JSON.stringify({ offersDisabled: true }));
    expect(readTourProgress(KEY).offersDisabled).toBe(true);
  });

  it('keeps only true flags', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ completed: { a: true, b: false, c: 1 } }));
    expect(readTourProgress(KEY).completed).toEqual({ a: true });
  });

  it('ignores a blocked write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeTourProgress(KEY, EMPTY_TOUR_PROGRESS)).not.toThrow();
    spy.mockRestore();
  });
});
