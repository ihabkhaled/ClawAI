import { BadRequestException, NotFoundException } from '@nestjs/common';

import { LiveFeedEventKind } from '../../../../generated/prisma';
import { encodeHistoryCursor } from '../../utilities/history-cursor.utility';
import { HistoryService } from '../history.service';

const session = (id: string, createdAt: string) => ({
  id,
  userId: 'u1',
  runId: 'r1',
  streamId: 'st1',
  mode: 'AUDIO',
  language: 'en',
  state: 'DETACHED',
  startedAt: new Date(createdAt),
  createdAt: new Date(createdAt),
  detachedAt: null,
  billedSeconds: 60,
  stream: { title: 'T', sourceKind: 'HLS', sourceUrl: 'https://x', accessScope: 'PUBLIC' },
});

const row = (id: string, startAt: number, version = 1) => ({
  id,
  eventKey: `k-${id}`,
  kind: LiveFeedEventKind.SUMMARY,
  highlightType: null,
  startAt: BigInt(startAt),
  endAt: BigInt(startAt + 10),
  importance: 1,
  confidence: null,
  title: `title-${id}`,
  body: `body-${id}`,
  evidence: [],
  version,
});

function build() {
  const repository = {
    listSessions: vi.fn(),
    findOwnedSession: vi.fn(),
    listCoverage: vi.fn().mockResolvedValue([]),
    eventIdsInCoverage: vi.fn(),
    eventsByIds: vi.fn(),
    translationsFor: vi.fn(),
    findEvent: vi.fn(),
    findSessionCoveringEvent: vi.fn(),
    listVersions: vi.fn(),
  };
  return { repository, service: new HistoryService(repository as never) };
}

describe('HistoryService.listSessions', () => {
  it('returns a page and a cursor when more rows remain', async () => {
    const { repository, service } = build();
    repository.listSessions.mockResolvedValue([
      session('s3', '2026-11-22T12:00:00Z'),
      session('s2', '2026-11-22T11:00:00Z'),
      session('s1', '2026-11-22T10:00:00Z'),
    ]);
    const page = await service.listSessions('u1', { limit: 2 });
    expect(repository.listSessions).toHaveBeenCalledWith('u1', null, null, 3);
    expect(page.items.map((item) => item.id)).toEqual(['s3', 's2']);
    expect(page.nextCursor).toBe(encodeHistoryCursor('2026-11-22T11:00:00.000Z', 's2'));
  });

  it('has no cursor on the last page and passes a decoded cursor down', async () => {
    const { repository, service } = build();
    repository.listSessions.mockResolvedValue([session('s1', '2026-11-22T10:00:00Z')]);
    const cursor = encodeHistoryCursor('2026-11-22T11:00:00.000Z', 's2');
    const page = await service.listSessions('u1', { limit: 2, cursor });
    expect(page.nextCursor).toBeNull();
    expect(repository.listSessions.mock.calls[0]![1]).toEqual(new Date('2026-11-22T11:00:00.000Z'));
  });

  it('refuses a cursor that is not a date', async () => {
    const { service } = build();
    await expect(
      service.listSessions('u1', { limit: 2, cursor: encodeHistoryCursor('not-a-date', 'x') }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('HistoryService.listEvents', () => {
  it('answers 404 for a session the caller does not own', async () => {
    const { repository, service } = build();
    repository.findOwnedSession.mockResolvedValue(null);
    await expect(service.listEvents('u2', 's1', { limit: 5 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.eventIdsInCoverage).not.toHaveBeenCalled();
  });

  it('pages the covered events, merges gap markers and builds the next cursor', async () => {
    const { repository, service } = build();
    repository.findOwnedSession.mockResolvedValue(session('s1', '2026-11-22T10:00:00Z'));
    repository.listCoverage.mockResolvedValue([
      { id: 'c1', fromAt: 100n, toAt: 150n, endsInGap: true },
      { id: 'c2', fromAt: 400n, toAt: 500n, endsInGap: false },
    ]);
    repository.eventIdsInCoverage.mockResolvedValue(['e1', 'e2', 'e3']);
    repository.eventsByIds.mockResolvedValue([row('e1', 100), row('e2', 120)]);
    const page = await service.listEvents('u1', 's1', { limit: 2 });
    expect(repository.eventIdsInCoverage).toHaveBeenCalledWith('r1', 's1', null, 3);
    expect(page.items.map((item) => item.id)).toEqual(['e1', 'e2']);
    expect(page.nextCursor).toBe(encodeHistoryCursor('120', 'e2'));
    // the gap starts at 150, after this page's last event, so it belongs to the next page
    expect(page.items.some((item) => item.kind === LiveFeedEventKind.GAP)).toBe(false);

    repository.eventIdsInCoverage.mockResolvedValue(['e3']);
    repository.eventsByIds.mockResolvedValue([row('e3', 420)]);
    const next = await service.listEvents('u1', 's1', { limit: 2, cursor: page.nextCursor ?? '' });
    expect(next.items.map((item) => item.id)).toEqual(['gap:c1', 'e3']);
    expect(next.nextCursor).toBeNull();
    expect(next.items[0]).toMatchObject({ startAt: 150, endAt: 400 });
  });

  it('applies a translation only when it matches the card version', async () => {
    const { repository, service } = build();
    repository.findOwnedSession.mockResolvedValue(session('s1', '2026-11-22T10:00:00Z'));
    repository.eventIdsInCoverage.mockResolvedValue(['e1', 'e2']);
    repository.eventsByIds.mockResolvedValue([row('e1', 1, 2), row('e2', 2, 1)]);
    repository.translationsFor.mockResolvedValue([
      { targetId: 'e1', sourceVersion: 1, title: 'old', text: 'old' },
      { targetId: 'e2', sourceVersion: 1, title: 'Titre', text: 'Corps' },
    ]);
    const page = await service.listEvents('u1', 's1', { limit: 5, language: 'fr' });
    expect(page.items[0]).toMatchObject({ id: 'e1', title: 'title-e1', translated: false });
    expect(page.items[1]).toMatchObject({ id: 'e2', title: 'Titre', translated: true });
  });

  it('returns only gaps when the session never attached to a run', async () => {
    const { repository, service } = build();
    repository.findOwnedSession.mockResolvedValue({
      ...session('s1', '2026-11-22T10:00:00Z'),
      runId: null,
    });
    const page = await service.listEvents('u1', 's1', { limit: 5 });
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it('refuses an events cursor that is not a number', async () => {
    const { repository, service } = build();
    repository.findOwnedSession.mockResolvedValue(session('s1', '2026-11-22T10:00:00Z'));
    await expect(
      service.listEvents('u1', 's1', { limit: 5, cursor: encodeHistoryCursor('abc', 'x') }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('HistoryService.collectEvents', () => {
  it('walks every page and flags truncation at the cap', async () => {
    const { repository, service } = build();
    repository.findOwnedSession.mockResolvedValue(session('s1', '2026-11-22T10:00:00Z'));
    repository.eventIdsInCoverage
      .mockResolvedValueOnce(['e1', 'e2'])
      .mockResolvedValueOnce(['e3', 'e4'])
      .mockResolvedValueOnce(['e5']);
    repository.eventsByIds
      .mockResolvedValueOnce([row('e1', 1)])
      .mockResolvedValueOnce([row('e3', 3)])
      .mockResolvedValueOnce([row('e5', 5)]);
    const all = await service.collectEvents('u1', 's1', 1, 10);
    expect(all.events.map((event) => event.id)).toEqual(['e1', 'e3', 'e5']);
    expect(all.truncated).toBe(false);

    repository.eventIdsInCoverage.mockReset().mockResolvedValue(['e1', 'e2']);
    repository.eventsByIds.mockReset().mockResolvedValue([row('e1', 1)]);
    const capped = await service.collectEvents('u1', 's1', 1, 1);
    expect(capped.events).toHaveLength(1);
    expect(capped.truncated).toBe(true);
  });
});

describe('HistoryService.listVersions', () => {
  it('answers 404 when the user has no session whose coverage includes the event', async () => {
    const { repository, service } = build();
    repository.findEvent.mockResolvedValue({
      id: 'e1',
      runId: 'r1',
      startAt: 1n,
      endAt: null,
      version: 1,
    });
    repository.findSessionCoveringEvent.mockResolvedValue(null);
    await expect(service.listVersions('u2', 'e1')).rejects.toBeInstanceOf(NotFoundException);
    repository.findEvent.mockResolvedValue(null);
    await expect(service.listVersions('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists the versions of a covered event', async () => {
    const { repository, service } = build();
    repository.findEvent.mockResolvedValue({
      id: 'e1',
      runId: 'r1',
      startAt: 1n,
      endAt: null,
      version: 2,
    });
    repository.findSessionCoveringEvent.mockResolvedValue({ id: 's1' });
    repository.listVersions.mockResolvedValue([
      { version: 1, title: 'a', body: 'b', createdAt: new Date('2026-11-22T10:00:00Z') },
    ]);
    await expect(service.listVersions('u1', 'e1')).resolves.toEqual([
      { version: 1, title: 'a', body: 'b', createdAt: '2026-11-22T10:00:00.000Z' },
    ]);
  });
});
