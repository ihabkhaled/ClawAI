import { vi, type Mock } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { ArchiveSnapshotFetchAdapter } from '../archive-snapshot-fetch.adapter';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

function htmlResponse(html: string): Record<string, unknown> {
  const bytes = new TextEncoder().encode(html);
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

describe('ArchiveSnapshotFetchAdapter', () => {
  const snapshotUrl = 'http://web.archive.org/web/20200102030405/https://example.com/';

  beforeEach(() => {
    vi.clearAllMocks();
    (AppConfig.get as Mock).mockReturnValue({ RESEARCH_DOMAIN_ALLOWLIST: [] });
  });

  function availability(closest: Record<string, unknown> | undefined): Record<string, unknown> {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ archived_snapshots: closest === undefined ? {} : { closest } }),
    };
  }

  it('reads the raw id_ snapshot over HTTPS and labels it as an archived copy', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        availability({
          status: '200',
          available: true,
          url: snapshotUrl,
          timestamp: '20200102030405',
        }),
      )
      .mockResolvedValueOnce(
        htmlResponse(
          '<html><head><title>Old</title></head><body><p>Archived text</p></body></html>',
        ),
      );

    const result = await new ArchiveSnapshotFetchAdapter().fetchPage({
      url: 'https://example.com/',
    });

    expect(global.fetch).toHaveBeenLastCalledWith(
      'https://web.archive.org/web/20200102030405id_/https://example.com/',
      expect.objectContaining({ redirect: 'manual' }),
    );
    expect(result.content.startsWith('Archived copy, captured 2020-01-02')).toBe(true);
    expect(result.content).toContain('Archived text');
    expect(result.archivedAt).toBe('2020-01-02T03:04:05.000Z');
  });

  it('throws when the archive has no snapshot', async () => {
    global.fetch = vi.fn().mockResolvedValue(availability(undefined));

    await expect(
      new ArchiveSnapshotFetchAdapter().fetchPage({ url: 'https://example.com/' }),
    ).rejects.toThrow(/No Wayback snapshot/u);
  });

  it('throws when the availability API itself errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      new ArchiveSnapshotFetchAdapter().fetchPage({ url: 'https://example.com/' }),
    ).rejects.toThrow(/No Wayback snapshot/u);
  });

  it('never asks archive.org about a private or token-bearing URL', async () => {
    global.fetch = vi.fn();

    await expect(
      new ArchiveSnapshotFetchAdapter().fetchPage({ url: 'http://192.168.1.10/wiki' }),
    ).rejects.toThrow();
    await expect(
      new ArchiveSnapshotFetchAdapter().fetchPage({ url: 'https://example.com/?access_token=x' }),
    ).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws when the snapshot answers an error', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        availability({
          status: '200',
          available: true,
          url: snapshotUrl,
          timestamp: '20200102030405',
        }),
      )
      .mockResolvedValueOnce({ ok: false, status: 503, headers: { get: () => null }, body: null });

    await expect(
      new ArchiveSnapshotFetchAdapter().fetchPage({ url: 'https://example.com/' }),
    ).rejects.toThrow(/HTTP 503/u);
  });
});
