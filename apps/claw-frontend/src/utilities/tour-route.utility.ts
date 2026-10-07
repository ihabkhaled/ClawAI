import type { TourDefinition } from '@/types/tour.types';

/** Whether a path matches a pattern. A trailing `/*` matches anything deeper; otherwise exact. */
export function matchesTourRoute(pattern: string, path: string): boolean {
  const clean = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return clean.startsWith(`${base}/`);
  }
  return clean === pattern;
}

/** Whether a tour is offered on a path (locale prefix already removed). */
export function tourAppliesToPath(tour: TourDefinition, path: string): boolean {
  const included = tour.routes.some((pattern) => matchesTourRoute(pattern, path));
  const excluded = tour.excludedRoutes.some((pattern) => matchesTourRoute(pattern, path));
  return included && !excluded;
}

/** The tours for a path, in their listed order. */
export function toursForPath(
  tours: readonly TourDefinition[],
  path: string,
): readonly TourDefinition[] {
  return tours.filter((tour) => tourAppliesToPath(tour, path));
}
