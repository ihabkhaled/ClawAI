import type { RouterTraceLocaleTranslation } from './i18n.types';

/**
 * One of the nine flat phase-label keys on {@link RouterTraceLocaleTranslation}.
 *
 * Excludes `unavailable`, which is a nested group of decline-reason keys, not
 * a phase label — the map that resolves a stage id to a label key only ever
 * targets a flat key.
 */
export type RouterTraceLabelKey = Exclude<keyof RouterTraceLocaleTranslation, 'unavailable'>;

/** One of the four stable decline-reason keys routing-service can emit. */
export type RouterTraceReasonKey = keyof RouterTraceLocaleTranslation['unavailable'];
