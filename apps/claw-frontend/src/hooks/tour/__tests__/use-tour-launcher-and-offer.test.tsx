import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TOUR_OFFER_DELAY_MS } from '@/constants/tour.constants';
import { TOUR_DEFINITIONS } from '@/constants/tours.constants';
import { TourId } from '@/enums/tour-id.enum';
import { useTourLauncher } from '@/hooks/tour/use-tour-launcher';
import { useTourOffer } from '@/hooks/tour/use-tour-offer';
import { useTourStore } from '@/stores/tour.store';
import { tourAppliesToPath } from '@/utilities/tour-route.utility';
import { EMPTY_TOUR_PROGRESS } from '@/utilities/tour-storage.utility';

let mockPath = '/threads';

vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
vi.mock('@/hooks/tour/use-tour-content', async () => {
  const { TOURS_CONTENT_BY_LOCALE } = await import('@/constants/tours-content.constants');
  const { Locale } = await import('@/enums/locale.enum');
  return { useTourContent: () => TOURS_CONTENT_BY_LOCALE[Locale.EN] };
});

function resetStore(): void {
  window.localStorage.clear();
  useTourStore.setState({ activeTourId: null, stepIndex: 0, progress: EMPTY_TOUR_PROGRESS });
  useTourStore.getState().hydrate('claw.tours.v1:hooks-test');
}

describe('useTourLauncher', () => {
  beforeEach(() => {
    mockPath = '/threads';
    resetStore();
  });

  it('lists only the tours of the page the person is on', () => {
    const { result } = renderHook(() => useTourLauncher());
    const expected = TOUR_DEFINITIONS.filter((tour) => tourAppliesToPath(tour, '/threads')).map(
      (tour) => tour.id,
    );
    expect(result.current.here.map((entry) => entry.id)).toEqual(expected);
    expect(result.current.here.length).toBeGreaterThan(0);
  });

  it('lists nothing on a page with no tour', () => {
    mockPath = '/some/page/with/no/tour';
    const { result } = renderHook(() => useTourLauncher());
    expect(result.current.here).toEqual([]);
  });

  it('marks a completed tour and starts the chosen one', () => {
    const { result } = renderHook(() => useTourLauncher());
    act(() => result.current.start(TourId.ThreadsIntro));
    expect(useTourStore.getState().activeTourId).toBe(TourId.ThreadsIntro);
    act(() => useTourStore.getState().finish());
    const again = renderHook(() => useTourLauncher());
    expect(again.result.current.here.find((e) => e.id === TourId.ThreadsIntro)?.isCompleted).toBe(
      true,
    );
  });

  it('can turn offers off and on', () => {
    const { result } = renderHook(() => useTourLauncher());
    act(() => result.current.setOffersDisabled(true));
    expect(result.current.offersDisabled).toBe(true);
    act(() => result.current.setOffersDisabled(false));
    expect(result.current.offersDisabled).toBe(false);
  });
});

describe('useTourOffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPath = '/threads';
    resetStore();
  });

  it('offers a tour only after the delay and never starts it by itself', () => {
    const { result } = renderHook(() => useTourOffer());
    expect(result.current.offeredTourId).toBeNull();
    act(() => {
      vi.advanceTimersByTime(TOUR_OFFER_DELAY_MS + 10);
    });
    expect(result.current.offeredTourId).toBe(TourId.ThreadsIntro);
    expect(useTourStore.getState().activeTourId).toBeNull();
  });

  it('stops offering anywhere once the person chooses never', () => {
    const { result } = renderHook(() => useTourOffer());
    act(() => {
      vi.advanceTimersByTime(TOUR_OFFER_DELAY_MS + 10);
    });
    act(() => result.current.never());
    expect(result.current.offeredTourId).toBeNull();
    expect(useTourStore.getState().progress.offersDisabled).toBe(true);
  });

  it('does not offer again after Not now', () => {
    const { result } = renderHook(() => useTourOffer());
    act(() => {
      vi.advanceTimersByTime(TOUR_OFFER_DELAY_MS + 10);
    });
    act(() => result.current.decline());
    expect(result.current.offeredTourId).toBeNull();
  });

  it('offers nothing while offers are off', () => {
    useTourStore.getState().setOffersDisabled(true);
    const { result } = renderHook(() => useTourOffer());
    act(() => {
      vi.advanceTimersByTime(TOUR_OFFER_DELAY_MS + 10);
    });
    expect(result.current.offeredTourId).toBeNull();
  });
});
