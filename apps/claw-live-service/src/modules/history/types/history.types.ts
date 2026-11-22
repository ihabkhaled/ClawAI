import type {
  LiveFeedEventKind,
  LiveHighlightType,
  LiveMode,
  LiveSessionState,
  LiveSourceKind,
} from '../../../generated/prisma';

export type HistoryCursor = { at: string; id: string };

export type HistorySessionView = {
  id: string;
  runId: string | null;
  streamId: string;
  title: string | null;
  sourceKind: LiveSourceKind;
  /** Null unless the source is public or the caller's own private one. */
  sourceUrl: string | null;
  mode: LiveMode;
  language: string;
  state: LiveSessionState;
  startedAt: string;
  detachedAt: string | null;
  billedSeconds: number;
};

export type HistoryPage<T> = { items: T[]; nextCursor: string | null };

export type HistoryEventView = {
  id: string;
  eventKey: string | null;
  kind: LiveFeedEventKind;
  highlightType: LiveHighlightType | null;
  startAt: number;
  endAt: number | null;
  importance: number;
  confidence: number | null;
  title: string;
  body: string;
  evidence: unknown;
  version: number;
  translated: boolean;
};

export type HistoryVersionView = {
  version: number;
  title: string;
  body: string;
  createdAt: string;
};

export type CoverageInterval = {
  id: string;
  fromAt: bigint;
  toAt: bigint;
  endsInGap: boolean;
};

export type StoredEventRow = {
  id: string;
  eventKey: string;
  kind: LiveFeedEventKind;
  highlightType: LiveHighlightType | null;
  startAt: bigint;
  endAt: bigint | null;
  importance: number;
  confidence: number | null;
  title: string;
  body: string;
  evidence: unknown;
  version: number;
};

export type StoredTranslation = {
  targetId: string;
  sourceVersion: number;
  title: string | null;
  text: string;
};

export type ExportDocument = {
  sessionId: string;
  title: string | null;
  sourceKind: LiveSourceKind;
  sourceUrl: string | null;
  startedAt: Date;
  language: string;
  events: HistoryEventView[];
  truncated: boolean;
};

export type SessionRowWithStream = {
  id: string;
  userId: string;
  runId: string | null;
  streamId: string;
  mode: LiveMode;
  language: string;
  state: LiveSessionState;
  startedAt: Date;
  createdAt: Date;
  detachedAt: Date | null;
  billedSeconds: number;
  stream: {
    title: string | null;
    sourceKind: LiveSourceKind;
    sourceUrl: string;
    accessScope: string;
  };
};

export type ExportedFile = { body: Buffer; mimeType: string; fileName: string };
