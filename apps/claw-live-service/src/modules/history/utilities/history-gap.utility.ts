import { LiveFeedEventKind } from '../../../generated/prisma';
import { GAP_EVENT_ID_PREFIX } from '../constants/history.constants';
import type { CoverageInterval, HistoryEventView } from '../types/history.types';

function byFrom(a: CoverageInterval, b: CoverageInterval): number {
  if (a.fromAt < b.fromAt) return -1;
  return a.fromAt > b.fromAt ? 1 : 0;
}

/**
 * One GAP marker per coverage interval that ended in a jump to the Live Edge, spanning from the end of
 * that interval to the start of the next one. A trailing interval with no successor has no visible gap.
 */
export function buildGapMarkers(coverage: CoverageInterval[]): HistoryEventView[] {
  const ordered = [...coverage].sort(byFrom);
  const markers: HistoryEventView[] = [];
  for (const [index, interval] of ordered.entries()) {
    const next = ordered[index + 1];
    if (!interval.endsInGap || next === undefined) continue;
    markers.push({
      id: `${GAP_EVENT_ID_PREFIX}${interval.id}`,
      eventKey: null,
      kind: LiveFeedEventKind.GAP,
      highlightType: null,
      startAt: Number(interval.toAt),
      endAt: Number(next.fromAt),
      importance: 0,
      confidence: null,
      title: '',
      body: '',
      evidence: [],
      version: 1,
      translated: false,
    });
  }
  return markers;
}

/**
 * Gaps that belong to one page of events. A gap belongs to the page whose start-time window
 * (previous page's last start, this page's last start] contains it, so no gap repeats or goes missing.
 */
export function gapsForPage(
  gaps: HistoryEventView[],
  lowerExclusive: number | null,
  upperInclusive: number | null,
): HistoryEventView[] {
  return gaps.filter(
    (gap) =>
      (lowerExclusive === null || gap.startAt > lowerExclusive) &&
      (upperInclusive === null || gap.startAt <= upperInclusive),
  );
}

export function mergeByStart(
  events: HistoryEventView[],
  gaps: HistoryEventView[],
): HistoryEventView[] {
  return [...events, ...gaps].sort((a, b) => a.startAt - b.startAt);
}
