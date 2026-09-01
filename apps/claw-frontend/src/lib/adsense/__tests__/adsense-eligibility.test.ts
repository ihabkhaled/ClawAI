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

  it('loads on an eligible page in review mode even with serving disabled', () => {
    expect(
      shouldLoadAdSenseScript({
        isConfigured: true,
        reviewMode: true,
        servingEnabled: false,
        pathname: '/',
      }),
    ).toBe(true);
  });

  it('never loads in review mode on an ineligible page — review does not bypass eligibility', () => {
    // The bug this guards: review mode used to load the script on every route
    // regardless of path, which is exactly the "low value content" exposure
    // an AdSense reviewer would land on. Verification never needs the script
    // to run outside an eligible page — the meta tag alone verifies the account.
    for (const path of ['/chat', '/dashboard', '/login', '/billing', '/settings', '/admin']) {
      expect(
        shouldLoadAdSenseScript({
          isConfigured: true,
          reviewMode: true,
          servingEnabled: false,
          pathname: path,
        }),
      ).toBe(false);
    }
  });

  it('never loads on a public shared-chat page, even in review mode, while the review lockdown is on', () => {
    expect(
      shouldLoadAdSenseScript({
        isConfigured: true,
        reviewMode: true,
        servingEnabled: true,
        pathname: '/en/share/chat/AbCdEfGhIjKlMnOpQrStUv',
      }),
    ).toBe(false);
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
