import { LIVE_MAX_CAPTIONS } from '@/constants/live.constants';
import {
  LiveFeedEventKind,
  LiveHighlightType,
  LiveStatusCode,
  LiveStreamEventType,
} from '@/enums/live.enum';
import type {
  LiveCaption,
  LiveFeedCard,
  LiveFeedState,
  LiveHistoryEvent,
  LiveSessionUsage,
  LiveStreamEvent,
} from '@/types/live.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readEnum<T extends string>(values: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/**
 * One SSE `data:` payload as a typed event, or null when it is not one. Unknown types and malformed
 * frames are dropped rather than guessed at: the feed never shows something the server did not send.
 */
export function parseLiveStreamEvent(raw: string): LiveStreamEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const type = readEnum(Object.values(LiveStreamEventType), parsed.type);
  const startAt = readNumber(parsed, 'startAt');
  if (type === null || startAt === null) {
    return null;
  }
  return {
    type,
    runId: readString(parsed, 'runId') ?? '',
    startAt,
    endAt: readNumber(parsed, 'endAt') ?? undefined,
    language: readString(parsed, 'language') ?? undefined,
    status: readEnum(Object.values(LiveStatusCode), parsed.status) ?? undefined,
    data: isRecord(parsed.data) ? parsed.data : {},
  };
}

function toCard(event: LiveStreamEvent): LiveFeedCard | null {
  const eventId = readString(event.data, 'eventId');
  if (eventId === null) {
    return null;
  }
  const isHighlight = event.type === LiveStreamEventType.HIGHLIGHT;
  return {
    eventId,
    kind:
      readEnum(Object.values(LiveFeedEventKind), event.data.kind) ??
      (isHighlight ? LiveFeedEventKind.HIGHLIGHT : LiveFeedEventKind.SUMMARY),
    title: readString(event.data, 'title') ?? '',
    body: readString(event.data, 'body') ?? '',
    importance: readNumber(event.data, 'importance') ?? 0,
    version: readNumber(event.data, 'version') ?? 1,
    startAt: event.startAt,
    endAt: event.endAt ?? null,
    highlightType: readEnum(Object.values(LiveHighlightType), event.data.highlightType),
  };
}

/** The session usage block (`LiveSessionUsageView`), or null when the shape is not that. */
export function parseLiveSessionUsage(value: unknown): LiveSessionUsage | null {
  if (!isRecord(value) || !isRecord(value.month) || typeof value.paidApproved !== 'boolean') {
    return null;
  }
  const numbers = ['billedSeconds', 'pendingSeconds', 'spentMicroUsd'].every(
    (key) => readNumber(value, key) !== null,
  );
  return numbers ? (value as LiveSessionUsage) : null;
}

/** A history event (`id`, already-translated `title`/`body`) as the card the feed renders. */
export function liveHistoryEventToCard(event: LiveHistoryEvent): LiveFeedCard {
  return {
    eventId: event.id,
    kind: event.kind,
    title: event.title,
    body: event.body,
    importance: event.importance,
    version: event.version,
    startAt: event.startAt,
    endAt: event.endAt,
    highlightType: event.highlightType,
  };
}

/** Insert or update by eventId; an older version never overwrites a newer one. Sorted by media time. */
export function upsertLiveCard(cards: LiveFeedCard[], next: LiveFeedCard): LiveFeedCard[] {
  const index = cards.findIndex((card) => card.eventId === next.eventId);
  if (index === -1) {
    return [...cards, next].toSorted((a, b) => a.startAt - b.startAt);
  }
  const current = cards[index];
  if (current === undefined || current.version > next.version) {
    return cards;
  }
  const merged: LiveFeedCard = {
    ...next,
    translatedTitle: current.version === next.version ? current.translatedTitle : undefined,
    translatedBody: current.version === next.version ? current.translatedBody : undefined,
  };
  return cards.map((card, position) => (position === index ? merged : card));
}

/** A translated copy (`data: { eventId, version, title, body }`) of the version it was made from. */
function applyCardTranslation(cards: LiveFeedCard[], event: LiveStreamEvent): LiveFeedCard[] {
  const eventId = readString(event.data, 'eventId');
  const version = readNumber(event.data, 'version');
  const title = readString(event.data, 'title');
  const body = readString(event.data, 'body');
  return cards.map((card) =>
    card.eventId === eventId && (version === null || version === card.version)
      ? {
          ...card,
          translatedTitle: title ?? card.translatedTitle,
          translatedBody: body ?? card.translatedBody,
        }
      : card,
  );
}

function applyCaption(state: LiveFeedState, event: LiveStreamEvent): LiveFeedState {
  const segmentId = readString(event.data, 'segmentId');
  const text = readString(event.data, 'text');
  if (segmentId === null || text === null) {
    return state;
  }
  if (state.captions.some((caption) => caption.segmentId === segmentId)) {
    return state;
  }
  const caption: LiveCaption = {
    segmentId,
    text,
    language: readString(event.data, 'language'),
    startAt: event.startAt,
    endAt: event.endAt ?? null,
    uncertain: event.data.uncertain === true,
  };
  const captions = [...state.captions, caption]
    .toSorted((a, b) => a.startAt - b.startAt)
    .slice(-LIVE_MAX_CAPTIONS);
  return { ...state, captions };
}

function applyCaptionTranslation(
  state: LiveFeedState,
  event: LiveStreamEvent,
  language: string,
): LiveFeedState {
  const segmentId = readString(event.data, 'segmentId');
  const text = readString(event.data, 'text');
  if (event.language !== language || segmentId === null || text === null) {
    return state;
  }
  return { ...state, captionTranslations: { ...state.captionTranslations, [segmentId]: text } };
}

function applyCardEvent(
  state: LiveFeedState,
  event: LiveStreamEvent,
  language: string,
): LiveFeedState {
  const isHighlight = event.type === LiveStreamEventType.HIGHLIGHT;
  if (event.language !== undefined) {
    // A translated copy of a card: only the session language is kept. It carries no kind, so it is
    // matched by eventId in both lists.
    return event.language === language
      ? {
          ...state,
          cards: applyCardTranslation(state.cards, event),
          highlights: applyCardTranslation(state.highlights, event),
        }
      : state;
  }
  const card = toCard(event);
  if (card === null) {
    return state;
  }
  if (card.kind === LiveFeedEventKind.HIGHLIGHT || isHighlight) {
    return { ...state, highlights: upsertLiveCard(state.highlights, card) };
  }
  return { ...state, cards: upsertLiveCard(state.cards, card) };
}

/** The feed reducer: every SSE event lands here, in any order, any number of times (idempotent). */
export function applyLiveStreamEvent(
  state: LiveFeedState,
  event: LiveStreamEvent,
  language: string,
): LiveFeedState {
  switch (event.type) {
    case LiveStreamEventType.CAPTION: {
      return applyCaption(state, event);
    }
    case LiveStreamEventType.CAPTION_TRANSLATION: {
      return applyCaptionTranslation(state, event, language);
    }
    case LiveStreamEventType.CARD:
    case LiveStreamEventType.CARD_VERSION:
    case LiveStreamEventType.HIGHLIGHT: {
      return applyCardEvent(state, event, language);
    }
    case LiveStreamEventType.STATUS: {
      return event.status === undefined ? state : { ...state, status: event.status };
    }
    case LiveStreamEventType.USAGE: {
      const usage = parseLiveSessionUsage(event.data);
      return usage === null ? state : { ...state, usage };
    }
    default: {
      return state;
    }
  }
}
