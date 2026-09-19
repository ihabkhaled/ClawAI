import { describe, expect, it } from 'vitest';

import {
  fileAssetMinutesLeft,
  isFileAssetExpired,
  latestFileAsset,
} from '@/utilities/file-asset.utility';

const NOW = Date.parse('2026-09-19T12:00:00.000Z');
const asset = (overrides: Record<string, unknown> = {}) => ({
  id: 'a',
  url: '/u',
  downloadUrl: '/api/v1/file-generations/g/assets/a/download',
  mimeType: 'application/pdf',
  sizeBytes: 1,
  expiresAt: '2026-09-19T12:45:00.000Z',
  expiredAt: null,
  createdAt: '2026-09-19T11:45:00.000Z',
  ...overrides,
});

describe('file asset utility', () => {
  // A rebuild adds an asset; the newest is the one to offer.
  it('picks the newest asset', () => {
    expect(
      latestFileAsset([
        asset({ id: 'old', createdAt: '2026-09-19T10:00:00.000Z' }),
        asset({ id: 'new', createdAt: '2026-09-19T11:00:00.000Z' }),
      ])?.id,
    ).toBe('new');
    expect(latestFileAsset(undefined)).toBeUndefined();
  });

  it('is expired once swept or once the hour is up', () => {
    expect(isFileAssetExpired(asset(), NOW)).toBe(false);
    expect(isFileAssetExpired(asset({ expiredAt: '2026-09-19T11:59:00.000Z' }), NOW)).toBe(true);
    expect(isFileAssetExpired(asset({ expiresAt: '2026-09-19T11:59:59.000Z' }), NOW)).toBe(true);
    expect(isFileAssetExpired(asset({ expiresAt: null }), NOW)).toBe(false);
  });

  it('counts whole minutes left, never 0 while valid', () => {
    expect(fileAssetMinutesLeft(asset(), NOW)).toBe(45);
    // A fresh file a few seconds past 60 min still says 60.
    expect(fileAssetMinutesLeft(asset({ expiresAt: '2026-09-19T13:00:05.000Z' }), NOW)).toBe(60);
    expect(fileAssetMinutesLeft(asset({ expiresAt: '2026-09-19T12:00:10.000Z' }), NOW)).toBe(1);
    expect(fileAssetMinutesLeft(asset({ expiresAt: null }), NOW)).toBeNull();
  });
});
