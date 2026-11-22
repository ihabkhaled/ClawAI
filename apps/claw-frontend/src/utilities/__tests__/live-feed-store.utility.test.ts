import { describe, expect, it } from 'vitest';

import { LIVE_EMPTY_FEED_STATE } from '@/constants/live.constants';
import {
  LiveFeedEventKind,
  LiveHighlightType,
  LiveStatusCode,
  LiveStreamEventType,
} from '@/enums/live.enum';
import type { LiveFeedState, LiveSessionUsage, LiveStreamEvent } from '@/types/live.types';
import {
  applyLiveStreamEvent,
  liveHistoryEventToCard,
  parseLiveSessionUsage,
  parseLiveStreamEvent,
} from '@/utilities/live-feed-store.utility';

function event(partial: Partial<LiveStreamEvent> & { type: LiveStreamEventType }): LiveStreamEvent {
  return { runId: 'r1', startAt: 1000, data: {}, ...partial };
}

function apply(events: LiveStreamEvent[], language = 'de'): LiveFeedState {
  return events.reduce(
    (state, next) => applyLiveStreamEvent(state, next, language),
    LIVE_EMPTY_FEED_STATE,
  );
}

/** The `data` of summary.manager `cardEvent` (the exact keys the backend publishes). */
function cardData(
  eventId: string,
  version: number,
  title: string,
  body: string,
): Record<string, unknown> {
  return {
    eventId,
    eventKey: `run:${eventId}`,
    kind: LiveFeedEventKind.SUMMARY,
    highlightType: null,
    title,
    body,
    importance: 3,
    confidence: 0.8,
    version,
    isOpen: true,
  };
}

const USAGE: LiveSessionUsage = {
  billedSeconds: 60,
  pendingSeconds: 5,
  spentMicroUsd: 0,
  paidApproved: false,
  spendingCapMicroUsd: null,
  month: {
    month: '2026-11',
    freeSecondsTotal: 1800,
    freeSecondsUsed: 60,
    paidMicroUsdPerMinute: 20_000,
    graceSeconds: 60,
    policyVersion: 1,
  },
};

describe('parseLiveStreamEvent', () => {
  it('parses the backend envelope (id, seq, type inside the JSON) and rejects malformed frames', () => {
    const frame = {
      id: 'r1:7',
      seq: 7,
      type: 'caption',
      runId: 'r1',
      startAt: 5,
      endAt: 9,
      data: { segmentId: 's1', seq: 3, text: 'hi', language: 'en', uncertain: false },
    };
    expect(parseLiveStreamEvent(JSON.stringify(frame))).toMatchObject({
      type: LiveStreamEventType.CAPTION,
      runId: 'r1',
      startAt: 5,
      endAt: 9,
    });
    expect(parseLiveStreamEvent('not json')).toBeNull();
    expect(parseLiveStreamEvent(JSON.stringify({ type: 'nope', startAt: 5 }))).toBeNull();
    expect(parseLiveStreamEvent(JSON.stringify({ type: 'caption' }))).toBeNull();
  });
});

describe('applyLiveStreamEvent', () => {
  it('stores captions once, sorted by media time', () => {
    const state = apply([
      event({
        type: LiveStreamEventType.CAPTION,
        startAt: 2000,
        endAt: 2500,
        data: { segmentId: 'b', seq: 2, text: 'two', language: 'en', uncertain: false },
      }),
      event({
        type: LiveStreamEventType.CAPTION,
        startAt: 1000,
        endAt: 1500,
        data: { segmentId: 'a', seq: 1, text: 'one', language: 'en', uncertain: false },
      }),
      event({
        type: LiveStreamEventType.CAPTION,
        startAt: 2000,
        data: { segmentId: 'b', seq: 2, text: 'two', language: 'en', uncertain: false },
      }),
    ]);
    expect(state.captions.map((c) => c.segmentId)).toEqual(['a', 'b']);
    expect(state.captions[0]).toMatchObject({ text: 'one', endAt: 1500, uncertain: false });
  });

  it('keeps only caption translations for the session language', () => {
    const state = apply([
      event({
        type: LiveStreamEventType.CAPTION_TRANSLATION,
        language: 'de',
        data: { segmentId: 'a', seq: 1, text: 'eins' },
      }),
      event({
        type: LiveStreamEventType.CAPTION_TRANSLATION,
        language: 'fr',
        data: { segmentId: 'a', seq: 1, text: 'un' },
      }),
    ]);
    expect(state.captionTranslations).toEqual({ a: 'eins' });
  });

  it('reads the card body, updates in place on card_version and ignores an older version', () => {
    const state = apply([
      event({ type: LiveStreamEventType.CARD, data: cardData('e1', 1, 'v1', 'b1') }),
      event({ type: LiveStreamEventType.CARD_VERSION, data: cardData('e1', 3, 'v3', 'b3') }),
      event({ type: LiveStreamEventType.CARD_VERSION, data: cardData('e1', 2, 'v2', 'b2') }),
    ]);
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0]).toMatchObject({ title: 'v3', body: 'b3', version: 3, importance: 3 });
  });

  it('routes highlights to their own list with the type', () => {
    const state = apply([
      event({
        type: LiveStreamEventType.HIGHLIGHT,
        data: {
          ...cardData('h1', 1, 'Launch', 'We ship'),
          kind: LiveFeedEventKind.HIGHLIGHT,
          highlightType: 'ANNOUNCEMENT',
          importance: 4,
        },
      }),
    ]);
    expect(state.highlights[0]).toMatchObject({
      eventId: 'h1',
      body: 'We ship',
      highlightType: LiveHighlightType.ANNOUNCEMENT,
      importance: 4,
    });
    expect(state.cards).toHaveLength(0);
  });

  it('keeps a vision card (no importance / highlightType in its data)', () => {
    const state = apply([
      event({
        type: LiveStreamEventType.CARD,
        data: {
          eventId: 'v1',
          eventKey: 'k',
          kind: 'VISUAL',
          title: '',
          body: 'A slide',
          version: 1,
          isOpen: false,
        },
      }),
    ]);
    expect(state.cards[0]).toMatchObject({ kind: LiveFeedEventKind.VISUAL, body: 'A slide' });
  });

  it('applies a translated card ({eventId, version, title, body}) only for the session language and version', () => {
    const state = apply([
      event({ type: LiveStreamEventType.CARD, data: cardData('e1', 1, 'Hello', 'World') }),
      event({
        type: LiveStreamEventType.CARD,
        language: 'de',
        data: { eventId: 'e1', version: 1, title: 'Hallo', body: 'Welt' },
      }),
      event({
        type: LiveStreamEventType.CARD,
        language: 'fr',
        data: { eventId: 'e1', version: 1, title: 'Bonjour', body: 'Monde' },
      }),
      event({
        type: LiveStreamEventType.CARD,
        language: 'de',
        data: { eventId: 'e1', version: 0, title: 'Alt', body: 'Alt' },
      }),
    ]);
    expect(state.cards[0]).toMatchObject({
      title: 'Hello',
      translatedTitle: 'Hallo',
      translatedBody: 'Welt',
    });
  });

  it('takes the status from a session-scoped billing status event', () => {
    const state = apply([
      event({
        type: LiveStreamEventType.STATUS,
        status: LiveStatusCode.GRACE,
        data: { sessionId: 's1', sessionState: 'GRACE' },
      }),
    ]);
    expect(state.status).toBe(LiveStatusCode.GRACE);
  });

  it('stores a session usage block and ignores a malformed one', () => {
    const state = apply([event({ type: LiveStreamEventType.USAGE, data: { ...USAGE } })]);
    expect(state.usage).toEqual(USAGE);
    const unchanged = applyLiveStreamEvent(
      state,
      event({ type: LiveStreamEventType.USAGE, data: { freeSecondsLeft: 3 } }),
      'de',
    );
    expect(unchanged.usage).toEqual(USAGE);
  });
});

describe('parseLiveSessionUsage', () => {
  it('accepts LiveSessionUsageView and rejects anything else', () => {
    expect(parseLiveSessionUsage(USAGE)).toEqual(USAGE);
    expect(parseLiveSessionUsage({ ...USAGE, month: null })).toBeNull();
    expect(parseLiveSessionUsage(null)).toBeNull();
  });
});

describe('liveHistoryEventToCard', () => {
  it('maps a HistoryEventView (id, body) to a feed card', () => {
    expect(
      liveHistoryEventToCard({
        id: 'e9',
        eventKey: 'k',
        kind: LiveFeedEventKind.SUMMARY,
        highlightType: null,
        startAt: 10,
        endAt: null,
        importance: 2,
        confidence: null,
        title: 'T',
        body: 'B',
        evidence: null,
        version: 2,
        translated: true,
      }),
    ).toEqual({
      eventId: 'e9',
      kind: LiveFeedEventKind.SUMMARY,
      title: 'T',
      body: 'B',
      importance: 2,
      version: 2,
      startAt: 10,
      endAt: null,
      highlightType: null,
    });
  });
});
