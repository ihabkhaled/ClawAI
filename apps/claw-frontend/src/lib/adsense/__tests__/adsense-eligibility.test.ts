import { describe, expect, it } from 'vitest';

import { isAdUnitEligible, shouldLoadAdSenseScript } from '@/lib/adsense/adsense-eligibility';
import { getAdEligiblePaths } from '@/utilities/content-registry.utility';

// The REAL registry-derived list, exactly what the server hands the client.
// Using it here keeps these assertions about the content registry rather than
// about a fixture that could drift from it.
const ELIGIBLE_PATHS = getAdEligiblePaths();

describe('isAdUnitEligible', () => {
  it('is true only for the reviewed ad-eligible homepage', () => {
    expect(isAdUnitEligible('/', ELIGIBLE_PATHS)).toBe(true);
  });

  it('is false for every portal route', () => {
    for (const path of ['/chat', '/dashboard', '/admin/plans', '/settings', '/agent']) {
      expect(isAdUnitEligible(path, ELIGIBLE_PATHS)).toBe(false);
    }
  });

  it('is false for auth routes and unknown paths', () => {
    expect(isAdUnitEligible('/login', ELIGIBLE_PATHS)).toBe(false);
    expect(isAdUnitEligible('/register', ELIGIBLE_PATHS)).toBe(false);
    expect(isAdUnitEligible('/anything-unregistered', ELIGIBLE_PATHS)).toBe(false);
  });

  it('is false for planned legal/contact pages', () => {
    for (const path of ['/contact', '/privacy', '/terms', '/cookies', '/acceptable-use']) {
      expect(isAdUnitEligible(path, ELIGIBLE_PATHS)).toBe(false);
    }
  });
});

describe('shouldLoadAdSenseScript', () => {
  it('never loads when the client id is not configured', () => {
    expect(
      shouldLoadAdSenseScript({
        eligiblePaths: ELIGIBLE_PATHS,
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
        eligiblePaths: ELIGIBLE_PATHS,
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
          eligiblePaths: ELIGIBLE_PATHS,
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
        eligiblePaths: ELIGIBLE_PATHS,
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
        eligiblePaths: ELIGIBLE_PATHS,
        isConfigured: true,
        reviewMode: false,
        servingEnabled: true,
        pathname: '/',
      }),
    ).toBe(true);
    expect(
      shouldLoadAdSenseScript({
        eligiblePaths: ELIGIBLE_PATHS,
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
        eligiblePaths: ELIGIBLE_PATHS,
        isConfigured: true,
        reviewMode: false,
        servingEnabled: true,
        pathname: '/chat',
      }),
    ).toBe(false);
  });
});
