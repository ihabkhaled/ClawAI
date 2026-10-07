import { NotFoundException } from '@nestjs/common';

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
