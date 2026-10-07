import { describe, expect, it } from 'vitest';

import { TourId } from '@/enums/tour-id.enum';
import type { TourDefinition } from '@/types/tour.types';
import { matchesTourRoute, tourAppliesToPath, toursForPath } from '@/utilities/tour-route.utility';

function makeTour(routes: string[], excludedRoutes: string[] = []): TourDefinition {
  return { id: TourId.ThreadsIntro, routes, excludedRoutes, autoOffer: true, steps: [] };
}

describe('matchesTourRoute', () => {
  it('matches an exact path and ignores a trailing slash', () => {
    expect(matchesTourRoute('/threads', '/threads')).toBe(true);
    expect(matchesTourRoute('/threads', '/threads/')).toBe(true);
    expect(matchesTourRoute('/threads', '/threads/abc')).toBe(false);
  });

  it('matches deeper paths for a wildcard but not the base itself', () => {
    expect(matchesTourRoute('/threads/*', '/threads/abc')).toBe(true);
    expect(matchesTourRoute('/threads/*', '/threads')).toBe(false);
    expect(matchesTourRoute('/threads/*', '/threadsx/abc')).toBe(false);
  });
});

describe('tourAppliesToPath / toursForPath', () => {
  it('honours excluded routes', () => {
    const tour = makeTour(['/threads/*'], ['/threads/new']);
    expect(tourAppliesToPath(tour, '/threads/abc')).toBe(true);
    expect(tourAppliesToPath(tour, '/threads/new')).toBe(false);
  });

  it('keeps listed order and drops non-matching tours', () => {
    const a = makeTour(['/a']);
    const b = makeTour(['/b']);
    expect(toursForPath([a, b, a], '/a')).toEqual([a, a]);
    expect(toursForPath([a, b], '/c')).toEqual([]);
  });
});
