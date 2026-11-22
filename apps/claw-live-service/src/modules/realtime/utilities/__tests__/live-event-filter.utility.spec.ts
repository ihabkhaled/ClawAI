import { LiveStatusCode } from '../../../../common/enums/live-status-code.enum';
import { LiveStreamEventType } from '../../../../common/enums/live-stream-event-type.enum';
import { LiveSessionState } from '../../../../generated/prisma';
import type { LiveEventEnvelope } from '../../types/live-event-bus.types';
import {
  formatSseFrame,
  parseEnvelope,
  parseLastEventId,
  shouldDeliver,
} from '../live-event-filter.utility';

const view = {
  sessionId: 's1',
  userId: 'u1',
  runId: 'run1',
  language: 'fr',
  state: LiveSessionState.ACTIVE,
};

function ev(overrides: Partial<LiveEventEnvelope> = {}): LiveEventEnvelope {
  return {
    id: 'run1:1',
    seq: 1,
    type: LiveStreamEventType.CAPTION,
    runId: 'run1',
    startAt: 1,
    data: {},
    ...overrides,
  };
}

describe('shouldDeliver', () => {
  it('delivers AI events of the attached run', () => {
    expect(shouldDeliver(ev(), view)).toBe(true);
    expect(shouldDeliver(ev({ type: LiveStreamEventType.CARD }), view)).toBe(true);
  });

  it('never delivers another run', () => {
    expect(shouldDeliver(ev({ runId: 'run2' }), view)).toBe(false);
    expect(shouldDeliver(ev(), { ...view, runId: null })).toBe(false);
  });

  it('delivers translations only in the viewer language', () => {
    const tr = (language: string) =>
      ev({ type: LiveStreamEventType.CAPTION_TRANSLATION, language });
    expect(shouldDeliver(tr('fr'), view)).toBe(true);
    expect(shouldDeliver(tr('FR'), view)).toBe(true);
    expect(shouldDeliver(tr('de'), view)).toBe(false);
    expect(shouldDeliver(ev({ type: LiveStreamEventType.CAPTION_TRANSLATION }), view)).toBe(false);
  });

  it('blocks AI events while credits are required or exhausted, but status always passes', () => {
    for (const state of [LiveSessionState.CREDITS_REQUIRED, LiveSessionState.EXHAUSTED]) {
      const blocked = { ...view, state };
      expect(shouldDeliver(ev(), blocked)).toBe(false);
      expect(shouldDeliver(ev({ type: LiveStreamEventType.HIGHLIGHT }), blocked)).toBe(false);
      expect(
        shouldDeliver(
          ev({ type: LiveStreamEventType.STATUS, status: LiveStatusCode.ENDED }),
          blocked,
        ),
      ).toBe(true);
    }
  });

  it('delivers session-scoped events only to their session', () => {
    const scoped = ev({ type: LiveStreamEventType.STATUS, data: { sessionId: 's2' } });
    expect(shouldDeliver(scoped, view)).toBe(false);
    expect(shouldDeliver({ ...scoped, data: { sessionId: 's1' } }, view)).toBe(true);
    expect(shouldDeliver(ev({ type: LiveStreamEventType.USAGE }), view)).toBe(false);
    expect(
      shouldDeliver(ev({ type: LiveStreamEventType.USAGE, data: { sessionId: 's1' } }), view),
    ).toBe(true);
  });
});

describe('parsing and framing', () => {
  it('parses Last-Event-ID', () => {
    expect(parseLastEventId('run1:42')).toEqual({ runId: 'run1', seq: 42 });
    expect(parseLastEventId(undefined)).toBeNull();
    expect(parseLastEventId('garbage')).toBeNull();
    expect(parseLastEventId('run1:-1')).toBeNull();
  });

  it('parses envelopes defensively', () => {
    expect(parseEnvelope(JSON.stringify(ev()))).toMatchObject({ seq: 1 });
    expect(parseEnvelope('[]')).toBeNull();
    expect(parseEnvelope('null')).toBeNull();
    expect(parseEnvelope('{')).toBeNull();
    expect(parseEnvelope(JSON.stringify({ id: 'x' }))).toBeNull();
  });

  it('formats one SSE frame with id and event name', () => {
    expect(formatSseFrame(ev())).toBe(
      `id: run1:1\nevent: caption\ndata: ${JSON.stringify(ev())}\n\n`,
    );
  });
});
