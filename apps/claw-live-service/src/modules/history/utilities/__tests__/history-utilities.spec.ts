import { BadRequestException } from '@nestjs/common';

import { LiveFeedEventKind } from '../../../../generated/prisma';
import type { CoverageInterval, ExportDocument, HistoryEventView } from '../../types/history.types';
import { decodeHistoryCursor, encodeHistoryCursor } from '../history-cursor.utility';
import { buildMarkdownExport, buildTextExport, exportFileName } from '../history-export.utility';
import { buildGapMarkers, gapsForPage, mergeByStart } from '../history-gap.utility';
import { toEventView, toSessionView, visibleSourceUrl } from '../history-view.utility';

const coverage = (id: string, from: number, to: number, endsInGap: boolean): CoverageInterval => ({
  id,
  fromAt: BigInt(from),
  toAt: BigInt(to),
  endsInGap,
});

const view = (over: Partial<HistoryEventView>): HistoryEventView => ({
  id: 'e1',
  eventKey: 'k',
  kind: LiveFeedEventKind.SUMMARY,
  highlightType: null,
  startAt: Date.UTC(2026, 10, 22, 10, 0, 0),
  endAt: Date.UTC(2026, 10, 22, 10, 1, 0),
  importance: 1,
  confidence: null,
  title: 'Title',
  body: 'Body',
  evidence: [],
  version: 1,
  translated: false,
  ...over,
});

describe('history cursor', () => {
  it('round-trips and treats an absent cursor as the first page', () => {
    const raw = encodeHistoryCursor('123', 'abc');
    expect(decodeHistoryCursor(raw)).toEqual({ at: '123', id: 'abc' });
    expect(decodeHistoryCursor(undefined)).toBeNull();
  });

  it.each([
    '%%%',
    Buffer.from('"x"').toString('base64url'),
    Buffer.from('{"at":1}').toString('base64url'),
  ])('refuses a malformed cursor (%s)', (raw) => {
    expect(() => decodeHistoryCursor(raw)).toThrow(BadRequestException);
  });
});

describe('gap markers', () => {
  it('synthesizes a marker between an interval that ended in a gap and the next one', () => {
    const markers = buildGapMarkers([
      coverage('c2', 5000, 6000, false),
      coverage('c1', 1000, 2000, true),
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      id: 'gap:c1',
      kind: LiveFeedEventKind.GAP,
      startAt: 2000,
      endAt: 5000,
    });
  });

  it('adds no marker for a trailing interval or one that did not end in a gap', () => {
    expect(buildGapMarkers([coverage('c1', 1, 2, true)])).toEqual([]);
    expect(buildGapMarkers([coverage('c1', 1, 2, false), coverage('c2', 3, 4, false)])).toEqual([]);
  });

  it('assigns each gap to exactly one page window', () => {
    const gaps = [view({ id: 'g1', startAt: 10 }), view({ id: 'g2', startAt: 20 })];
    expect(gapsForPage(gaps, null, 10).map((gap) => gap.id)).toEqual(['g1']);
    expect(gapsForPage(gaps, 10, 20).map((gap) => gap.id)).toEqual(['g2']);
    expect(gapsForPage(gaps, 20, null)).toEqual([]);
    expect(gapsForPage(gaps, null, null)).toHaveLength(2);
  });

  it('merges events and gaps by start time', () => {
    const merged = mergeByStart(
      [view({ id: 'a', startAt: 1 }), view({ id: 'c', startAt: 9 })],
      [view({ id: 'b', startAt: 5 })],
    );
    expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('history views', () => {
  const stream = {
    title: 'Show',
    sourceKind: 'HLS' as const,
    sourceUrl: 'https://x/y?t=1',
    accessScope: 'PRIVATE:u1',
  };

  it('shows a private source url only to its owner', () => {
    expect(visibleSourceUrl(stream, 'u1')).toBe('https://x/y?t=1');
    expect(visibleSourceUrl(stream, 'u2')).toBeNull();
    expect(visibleSourceUrl({ ...stream, accessScope: 'PUBLIC' }, 'u2')).toBe('https://x/y?t=1');
  });

  it('maps a session row and converts BigInt times to numbers', () => {
    const session = toSessionView(
      {
        id: 's1',
        userId: 'u1',
        runId: 'r1',
        streamId: 'st1',
        mode: 'AUDIO',
        language: 'en',
        state: 'DETACHED',
        startedAt: new Date('2026-11-22T10:00:00Z'),
        createdAt: new Date('2026-11-22T10:00:00Z'),
        detachedAt: null,
        billedSeconds: 120,
        stream,
      },
      'u1',
    );
    expect(session).toMatchObject({ id: 's1', billedSeconds: 120, detachedAt: null });
    const event = toEventView(
      {
        id: 'e1',
        eventKey: 'k',
        kind: 'SUMMARY',
        highlightType: null,
        startAt: 1_700_000_000_000n,
        endAt: null,
        importance: 2,
        confidence: 0.5,
        title: 'T',
        body: 'B',
        evidence: [],
        version: 3,
      },
      { targetId: 'e1', sourceVersion: 3, title: 'Titre', text: 'Corps' },
    );
    expect(event).toMatchObject({
      startAt: 1_700_000_000_000,
      endAt: null,
      title: 'Titre',
      body: 'Corps',
      translated: true,
    });
  });
});

describe('export builders', () => {
  const doc: ExportDocument = {
    sessionId: 's1',
    title: 'Launch keynote',
    sourceKind: 'HLS',
    sourceUrl: 'https://example.com/live.m3u8',
    startedAt: new Date('2026-11-22T10:00:00Z'),
    language: 'en',
    truncated: true,
    events: [
      view({ id: 'a', title: 'Opening', body: 'Welcome everyone.' }),
      view({
        id: 'h',
        kind: LiveFeedEventKind.HIGHLIGHT,
        title: 'Pricing',
        body: 'It costs 5.',
        endAt: null,
      }),
      view({
        id: 'g',
        kind: LiveFeedEventKind.GAP,
        startAt: Date.UTC(2026, 10, 22, 10, 5, 0),
        title: '',
        body: '',
      }),
    ],
  };

  it('writes markdown with title, source, range, cards, highlights and gaps', () => {
    const md = buildMarkdownExport(doc);
    expect(md).toContain('# Launch keynote');
    expect(md).toContain('Source: HLS (https://example.com/live.m3u8)');
    expect(md).toContain('## 10:00:00-10:01:00 Opening');
    expect(md).toContain('## 10:00:00 Highlight: Pricing');
    expect(md).toContain('not analyzed');
    expect(md).toContain('cut at the maximum');
  });

  it('writes plain text with the same content', () => {
    const txt = buildTextExport({
      ...doc,
      title: null,
      sourceUrl: null,
      truncated: false,
      events: [],
    });
    expect(txt).toContain('Live session');
    expect(txt).toContain('no cards recorded');
    expect(buildTextExport(doc)).toContain('[10:00:00] Highlight: Pricing');
    expect(buildTextExport(doc)).toContain('Not analyzed');
  });

  it('builds a header-safe file name', () => {
    expect(exportFileName('s1"; x=y', 'md')).toBe('live-s1xy.md');
  });
});
