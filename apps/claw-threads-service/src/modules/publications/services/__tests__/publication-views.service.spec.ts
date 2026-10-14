import { NotFoundException } from '@nestjs/common';

import { BOARD_NOTIFY_MIN_INTERVAL_MS } from '../../constants/publication-view.constants';
import { PublicationViewsService } from '../publication-views.service';

const BROWSER = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ INTER_SERVICE_AUTH_TOKEN: 's'.repeat(40) }) },
}));

const build = (counts: { viewCount: number; readerCount: number } | null) => {
  const views = {
    recordView: vi.fn().mockResolvedValue(counts),
    readCounts: vi.fn().mockResolvedValue(counts),
    purgeViewsBefore: vi.fn().mockResolvedValue(0),
  };
  return { views, service: new PublicationViewsService(views as never) };
};

describe('PublicationViewsService', () => {
  it('counts an anonymous human view without storing the address', async () => {
    const { views, service } = build({ viewCount: 5, readerCount: 1 });

    await expect(
      service.record('slug', { ip: '203.0.113.7', userAgent: BROWSER, userId: null }),
    ).resolves.toEqual({ viewCount: 5, readerCount: 1 });

    const call = views.recordView.mock.calls[0]?.[0] as {
      viewerHash: string;
      readerHash: string | null;
      windowStart: Date;
    };
    expect(call.readerHash).toBeNull();
    expect(call.viewerHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(call)).not.toContain('203.0.113.7');
    expect(Date.now() - call.windowStart.getTime()).toBeGreaterThan(29 * 60 * 1000);
  });

  it('counts a signed-in reader once as a distinct reader', async () => {
    const { views, service } = build({ viewCount: 5, readerCount: 2 });

    await service.record('slug', { ip: '203.0.113.7', userAgent: BROWSER, userId: 'user-1' });

    const call = views.recordView.mock.calls[0]?.[0] as { readerHash: string | null };
    expect(call.readerHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(call.readerHash).not.toContain('user-1');
  });

  it('never counts a crawler, but still returns the current numbers', async () => {
    const { views, service } = build({ viewCount: 5, readerCount: 1 });

    await expect(
      service.record('slug', { ip: '66.249.66.1', userAgent: 'Googlebot/2.1', userId: null }),
    ).resolves.toEqual({ viewCount: 5, readerCount: 1 });
    expect(views.recordView).not.toHaveBeenCalled();
    expect(views.readCounts).toHaveBeenCalledWith('slug');
  });

  it('answers a publication that is not public with 404', async () => {
    const { service } = build(null);

    await expect(
      service.record('private', { ip: '203.0.113.7', userAgent: BROWSER, userId: null }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('purges old rows on the retention interval only', () => {
    vi.useFakeTimers();
    const { views, service } = build({ viewCount: 0, readerCount: 0 });
    service.onModuleInit();

    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1);

    expect(views.purgeViewsBefore).toHaveBeenCalledTimes(1);
    const cutoff = views.purgeViewsBefore.mock.calls[0]?.[0] as Date;
    expect(Date.now() - cutoff.getTime()).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    service.onModuleDestroy();
    vi.useRealTimers();
  });
});

describe('PublicationViewsService board refresh', () => {
  const counts = { viewCount: 3, readerCount: 0 };
  const human = { ip: '203.0.113.7', userAgent: BROWSER, userId: null };
  const buildWithPort = (viewsChanged: () => Promise<void>) => {
    const views = {
      recordView: vi.fn().mockResolvedValue(counts),
      readCounts: vi.fn().mockResolvedValue(counts),
      purgeViewsBefore: vi.fn().mockResolvedValue(0),
    };
    const port = { viewsChanged: vi.fn(viewsChanged) };
    return { port, service: new PublicationViewsService(views as never, port as never) };
  };

  it('pushes the new count to the Board row after a human view', async () => {
    const { port, service } = buildWithPort(() => Promise.resolve());
    await service.record('slug', human);
    expect(port.viewsChanged).toHaveBeenCalledWith('slug');
  });

  it('does not touch the Board for a crawler', async () => {
    const { port, service } = buildWithPort(() => Promise.resolve());
    await service.record('slug', { ...human, userAgent: 'Googlebot/2.1' });
    expect(port.viewsChanged).not.toHaveBeenCalled();
  });

  it('never fails the view when the Board refresh throws', async () => {
    const { service } = buildWithPort(() => Promise.reject(new Error('index down')));
    await expect(service.record('slug', human)).resolves.toEqual(counts);
  });

  it('never waits for a hung Board refresh', async () => {
    const { service } = buildWithPort(() => new Promise<void>(() => {}));
    await expect(service.record('slug', human)).resolves.toEqual(counts);
  });

  it('coalesces refreshes per publication and refreshes again after the interval', async () => {
    vi.useFakeTimers();
    const { port, service } = buildWithPort(() => Promise.resolve());
    await service.record('slug', human);
    await service.record('slug', human);
    await service.record('other', human);
    expect(port.viewsChanged).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(BOARD_NOTIFY_MIN_INTERVAL_MS + 1);
    await service.record('slug', human);
    expect(port.viewsChanged).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
