import { beforeEach, describe, expect, it } from 'vitest';

import { TourId } from '@/enums/tour-id.enum';
import { useTourStore } from '@/stores/tour.store';
import { EMPTY_TOUR_PROGRESS, readTourProgress } from '@/utilities/tour-storage.utility';

const KEY = 'claw.tours.v1:store-test';

describe('tour store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useTourStore.setState({ activeTourId: null, stepIndex: 0, progress: EMPTY_TOUR_PROGRESS });
    useTourStore.getState().hydrate(KEY);
  });

  it('walks forward, back and never past either end', () => {
    const store = useTourStore.getState();
    store.start(TourId.ThreadsIntro);
    store.next(3);
    store.next(3);
    store.next(3);
    expect(useTourStore.getState().stepIndex).toBe(2);
    store.back();
    store.back();
    store.back();
    expect(useTourStore.getState().stepIndex).toBe(0);
  });

  it('marks a tour completed on finish and remembers it', () => {
    const store = useTourStore.getState();
    store.start(TourId.ThreadsIntro);
    store.finish();
    expect(useTourStore.getState().activeTourId).toBeNull();
    expect(readTourProgress(KEY).completed[TourId.ThreadsIntro]).toBe(true);
  });

  it('counts leaving early as having seen the offer, not as completed', () => {
    const store = useTourStore.getState();
    store.start(TourId.ThreadsIntro);
    store.skip();
    const saved = readTourProgress(KEY);
    expect(saved.completed[TourId.ThreadsIntro]).toBeUndefined();
    expect(saved.dismissedOffers[TourId.ThreadsIntro]).toBe(true);
  });

  it('turns offers off everywhere and back on, and remembers the choice', () => {
    const store = useTourStore.getState();
    store.setOffersDisabled(true);
    expect(useTourStore.getState().progress.offersDisabled).toBe(true);
    expect(readTourProgress(KEY).offersDisabled).toBe(true);
    store.setOffersDisabled(false);
    expect(readTourProgress(KEY).offersDisabled).toBe(false);
  });

  it('keeps the choice when a tour is finished afterwards', () => {
    const store = useTourStore.getState();
    store.setOffersDisabled(true);
    store.start(TourId.ThreadsIntro);
    store.finish();
    expect(readTourProgress(KEY).offersDisabled).toBe(true);
  });
});
