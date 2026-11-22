import type {
  HistoryEventView,
  HistorySessionView,
  SessionRowWithStream,
  StoredEventRow,
  StoredTranslation,
} from '../types/history.types';

/** A source URL is shown only when it is public or the caller's own private one. */
export function visibleSourceUrl(
  stream: { sourceUrl: string; accessScope: string },
  userId: string,
): string | null {
  return stream.accessScope === 'PUBLIC' || stream.accessScope === `PRIVATE:${userId}`
    ? stream.sourceUrl
    : null;
}

export function toSessionView(row: SessionRowWithStream, userId: string): HistorySessionView {
  return {
    id: row.id,
    runId: row.runId,
    streamId: row.streamId,
    title: row.stream.title,
    sourceKind: row.stream.sourceKind,
    sourceUrl: visibleSourceUrl(row.stream, userId),
    mode: row.mode,
    language: row.language,
    state: row.state,
    startedAt: row.startedAt.toISOString(),
    detachedAt: row.detachedAt?.toISOString() ?? null,
    billedSeconds: row.billedSeconds,
  };
}

/** BigInt media times become plain numbers (epoch ms fits a double). */
export function toEventView(
  row: StoredEventRow,
  translation: StoredTranslation | undefined,
): HistoryEventView {
  return {
    id: row.id,
    eventKey: row.eventKey,
    kind: row.kind,
    highlightType: row.highlightType,
    startAt: Number(row.startAt),
    endAt: row.endAt === null ? null : Number(row.endAt),
    importance: row.importance,
    confidence: row.confidence,
    title: translation?.title ?? row.title,
    body: translation?.text ?? row.body,
    evidence: row.evidence,
    version: row.version,
    translated: translation !== undefined,
  };
}
