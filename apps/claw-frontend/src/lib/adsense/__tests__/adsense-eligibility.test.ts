import { describe, expect, it } from 'vitest';

import { isAdUnitEligible, shouldLoadAdSenseScript } from '@/lib/adsense/adsense-eligibility';

describe('isAdUnitEligible', () => {
  it('is true only for the reviewed ad-eligible homepage', () => {
    expect(isAdUnitEligible('/')).toBe(true);
  });

  it('is false for every portal route', () => {
    for (const path of ['/chat', '/dashboard', '/admin/plans', '/settings', '/agent']) {
      expect(isAdUnitEligible(path)).toBe(false);
    }
  });

  it('is false for auth routes and unknown paths', () => {
    expect(isAdUnitEligible('/login')).toBe(false);
    expect(isAdUnitEligible('/register')).toBe(false);
    expect(isAdUnitEligible('/anything-unregistered')).toBe(false);
  });

  it('is false for planned legal/contact pages', () => {
    for (const path of ['/contact', '/privacy', '/terms', '/cookies', '/acceptable-use']) {
      expect(isAdUnitEligible(path)).toBe(false);
    }
  });
});

describe('shouldLoadAdSenseScript', () => {
  it('never loads when the client id is not configured', () => {
    expect(
      shouldLoadAdSenseScript({
        isConfigured: false,
        reviewMode: true,
        servingEnabled: true,
        pathname: '/',
      }),
    ).toBe(false);
  });

  it('loads in review mode regardless of serving/eligibility (verification only)', () => {
    expect(
      shouldLoadAdSenseScript({
        isConfigured: true,
        reviewMode: true,
        servingEnabled: false,
        pathname: '/',
      }),
    ).toBe(true);
  });

  it('loads on an eligible page only when serving is enabled', () => {
    expect(
      shouldLoadAdSenseScript({
        isConfigured: true,
        reviewMode: false,
        servingEnabled: true,
        pathname: '/',
      }),
    ).toBe(true);
    expect(
      shouldLoadAdSenseScript({
        isConfigured: true,
        reviewMode: false,
        servingEnabled: false,
        pathname: '/',
      }),
    ).toBe(false);
  });

  it('never loads on an ineligible page even with serving enabled', () => {
    expect(
      shouldLoadAdSenseScript({
        isConfigured: true,
        reviewMode: false,
        servingEnabled: true,
        pathname: '/chat',
      }),
    ).toBe(false);
  });
});
