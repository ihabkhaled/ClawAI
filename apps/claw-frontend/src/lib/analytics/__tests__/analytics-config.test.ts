import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAnalyticsConfig,
  isValidGaMeasurementId,
  isValidGtmContainerId,
} from '@/lib/analytics/analytics-config';

describe('analytics id validation', () => {
  it('accepts a real container id', () => {
    expect(isValidGtmContainerId('GTM-PPCVCPGM')).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['GTM-', 'prefix only'],
    ['PPCVCPGM', 'no prefix'],
    ['gtm-ppcvcpgm', 'lowercase'],
    // The failure this exists to stop: the whole snippet pasted in.
    ['<script>(function(w,d,s,l,i){w[l]=w[l]||[];', 'a pasted snippet'],
  ])('rejects %s (%s)', (value) => {
    expect(isValidGtmContainerId(value)).toBe(false);
  });

  it('accepts a GA4 measurement id and rejects a container id in its place', () => {
    expect(isValidGaMeasurementId('G-ABCD1234')).toBe(true);
    expect(isValidGaMeasurementId('GTM-PPCVCPGM')).toBe(false);
  });
});

describe('getAnalyticsConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports nothing configured when the environment is empty', () => {
    vi.stubEnv('NEXT_PUBLIC_GTM_ID', '');
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');

    expect(getAnalyticsConfig()).toEqual({ gtmContainerId: null, gaMeasurementId: null });
  });

  it('treats a malformed id as unconfigured rather than emitting it', () => {
    // Emitting it would request a container that does not exist on every page.
    vi.stubEnv('NEXT_PUBLIC_GTM_ID', 'GTM-XXXXXXX-placeholder');

    expect(getAnalyticsConfig().gtmContainerId).toBeNull();
  });

  it('resolves a valid container id', () => {
    vi.stubEnv('NEXT_PUBLIC_GTM_ID', 'GTM-PPCVCPGM');

    expect(getAnalyticsConfig().gtmContainerId).toBe('GTM-PPCVCPGM');
  });

  it('resolves the two independently', () => {
    vi.stubEnv('NEXT_PUBLIC_GTM_ID', '');
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-ABCD1234');

    expect(getAnalyticsConfig()).toEqual({
      gtmContainerId: null,
      gaMeasurementId: 'G-ABCD1234',
    });
  });
});
