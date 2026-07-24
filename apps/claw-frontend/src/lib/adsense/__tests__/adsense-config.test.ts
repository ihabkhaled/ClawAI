import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deriveAdSensePublisherId,
  getAdSenseConfig,
  isValidAdSenseClientId,
} from '@/lib/adsense/adsense-config';

describe('adsense-config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('validates the ca-pub client id format', () => {
    expect(isValidAdSenseClientId('ca-pub-2415314275784926')).toBe(true);
    expect(isValidAdSenseClientId('pub-2415314275784926')).toBe(false);
    expect(isValidAdSenseClientId('ca-pub-123')).toBe(false);
    expect(isValidAdSenseClientId('')).toBe(false);
    expect(isValidAdSenseClientId(null)).toBe(false);
    expect(isValidAdSenseClientId(undefined)).toBe(false);
  });

  it('derives the pub- seller id from a valid client id', () => {
    expect(deriveAdSensePublisherId('ca-pub-2415314275784926')).toBe('pub-2415314275784926');
    expect(deriveAdSensePublisherId('ca-pub-bad')).toBeNull();
    expect(deriveAdSensePublisherId(undefined)).toBeNull();
  });

  it('reports not configured when the client id is absent or malformed', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', '');
    expect(getAdSenseConfig().isConfigured).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'not-a-real-id');
    expect(getAdSenseConfig().isConfigured).toBe(false);
    expect(getAdSenseConfig().clientId).toBeNull();
  });

  it('reads serving + review flags and a valid client id', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_REVIEW_MODE', 'false');
    const config = getAdSenseConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.clientId).toBe('ca-pub-2415314275784926');
    expect(config.servingEnabled).toBe(true);
    expect(config.reviewMode).toBe(false);
  });

  it('defaults serving and review flags to false', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    const config = getAdSenseConfig();
    expect(config.servingEnabled).toBe(false);
    expect(config.reviewMode).toBe(false);
  });
});
