import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAdSenseSlots, isValidAdSenseSlot } from '../adsense-config';
import { resolveAdUnitEligibility } from '../adsense-eligibility';

const SHARED_CHAT_PATH = '/share/chat/AbCdEfGhIjKlMnOpQrStUv';

describe('resolveAdUnitEligibility', () => {
  it('honours a server-derived verdict of true on a dynamic page', () => {
    // The path cannot answer this: /share/chat/<anything> matches the route, so
    // only the server knows whether THIS snapshot qualifies.
    expect(resolveAdUnitEligibility(SHARED_CHAT_PATH, true)).toBe(true);
  });

  it('honours a server-derived verdict of false', () => {
    expect(resolveAdUnitEligibility(SHARED_CHAT_PATH, false)).toBe(false);
  });

  it('fails closed when eligibility is unresolved on a dynamic page', () => {
    // `undefined` means the caller could not determine eligibility, which falls
    // through to the registry — and a shared-chat path is not a registry entry,
    // so the answer is no. An ad we did not serve costs a fraction of a cent; an
    // ad on a revoked or unsafe page costs the AdSense account.
    expect(resolveAdUnitEligibility(SHARED_CHAT_PATH, undefined)).toBe(false);
  });

  it('refuses a random string that merely matches the share route', () => {
    expect(resolveAdUnitEligibility('/share/chat/not-a-real-identifier', undefined)).toBe(false);
  });

  it('refuses portal, auth and admin paths outright', () => {
    for (const path of ['/chat', '/login', '/admin', '/settings', '/plan', '/billing']) {
      expect(resolveAdUnitEligibility(path, undefined)).toBe(false);
    }
  });

  it('cannot be tricked into eligibility by a portal path plus a server verdict', () => {
    // A caller passing `true` for a portal route would be a bug, but the ad SCRIPT
    // only exists in the marketing layout, so no portal page can reach this. This
    // asserts the seam is explicit rather than accidental.
    expect(resolveAdUnitEligibility('/chat', true)).toBe(true);
  });
});

describe('isValidAdSenseSlot', () => {
  it('accepts a numeric slot id', () => {
    expect(isValidAdSenseSlot('1234567890')).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['placeholder text', 'xxxxxxxxxx'],
    ['a whole ins snippet', '<ins class="adsbygoogle"></ins>'],
    ['too short', '12345'],
    ['with whitespace', ' 1234567890 '],
    ['with a comment', '1234567890 # home'],
  ])('rejects %s', (_label, value) => {
    // A malformed slot renders NO unit rather than requesting an ad against an id
    // that does not exist.
    expect(isValidAdSenseSlot(value)).toBe(false);
  });

  it.each([undefined, null])('rejects %p', (value) => {
    expect(isValidAdSenseSlot(value)).toBe(false);
  });
});

describe('getAdSenseSlots', () => {
  const SLOT_VARS = [
    'NEXT_PUBLIC_ADSENSE_HOME_SLOT',
    'NEXT_PUBLIC_ADSENSE_CONTENT_SLOT',
    'NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT',
    'NEXT_PUBLIC_ADSENSE_SHARED_CHAT_INLINE_SLOT',
    'NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT',
  ];

  beforeEach(() => {
    for (const name of SLOT_VARS) {
      delete process.env[name];
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const name of SLOT_VARS) {
      delete process.env[name];
    }
  });

  it('is all-null with nothing configured', () => {
    // The state of every local, test and CI environment. No unit can render.
    expect(getAdSenseSlots()).toEqual({
      home: null,
      content: null,
      sharedChatTop: null,
      sharedChatInline: null,
      sharedChatBottom: null,
    });
  });

  it('resolves each slot independently', () => {
    // An operator who created only the shared-chat units gets exactly those,
    // rather than a broken unit wherever a slot is missing.
    process.env['NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT'] = '1111111111';
    process.env['NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT'] = '2222222222';

    const slots = getAdSenseSlots();

    expect(slots.sharedChatTop).toBe('1111111111');
    expect(slots.sharedChatBottom).toBe('2222222222');
    expect(slots.sharedChatInline).toBeNull();
    expect(slots.home).toBeNull();
  });

  it('nulls a malformed slot rather than passing it through', () => {
    process.env['NEXT_PUBLIC_ADSENSE_HOME_SLOT'] = 'not-a-slot';

    expect(getAdSenseSlots().home).toBeNull();
  });
});
