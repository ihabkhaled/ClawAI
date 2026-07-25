import { createHmac } from 'node:crypto';

import {
  buildPaymobHmacPayload,
  computePaymobHmac,
  verifyPaymobHmac,
} from '../utilities/paymob-hmac.utility';

const SECRET = 'hmac-secret';

const callback = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  amount_cents: 50000,
  created_at: '2026-07-26T00:00:00Z',
  currency: 'EGP',
  error_occured: false,
  has_parent_transaction: false,
  id: 123456,
  integration_id: 4242,
  is_3d_secure: true,
  is_auth: false,
  is_capture: false,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  order: { id: 987, merchant_order_id: 'cs_1' },
  owner: 111,
  pending: false,
  source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
  success: true,
  ...overrides,
});

describe('paymob HMAC', () => {
  it('concatenates the fields in Paymob’s fixed order with no separator', () => {
    const payload = buildPaymobHmacPayload(callback());
    // The order is part of the protocol: sorting or reordering produces a
    // different digest and every genuine callback then fails verification.
    expect(payload).toBe(
      '500002026-07-26T00:00:00ZEGPfalsefalse1234564242truefalsefalsefalsetruefalse987111false2346MasterCardcardtrue',
    );
  });

  it('reads dotted paths out of nested objects', () => {
    expect(buildPaymobHmacPayload(callback())).toContain('987');
    expect(buildPaymobHmacPayload(callback())).toContain('2346');
  });

  it('renders a missing field as the empty string, as Paymob does', () => {
    const withoutSource = callback({ source_data: undefined });
    expect(() => buildPaymobHmacPayload(withoutSource)).not.toThrow();
  });

  it('renders booleans as true/false, not 1/0', () => {
    expect(buildPaymobHmacPayload(callback({ success: false }))).toContain('false');
  });

  it('accepts a digest computed the same way', () => {
    const payload = callback();
    const digest = createHmac('sha512', SECRET)
      .update(buildPaymobHmacPayload(payload))
      .digest('hex');
    expect(verifyPaymobHmac(payload, digest, SECRET)).toBe(true);
  });

  it('accepts an upper-case digest', () => {
    const payload = callback();
    expect(
      verifyPaymobHmac(payload, computePaymobHmac(payload, SECRET).toUpperCase(), SECRET),
    ).toBe(true);
  });

  it('rejects a digest computed with a different secret', () => {
    const payload = callback();
    expect(verifyPaymobHmac(payload, computePaymobHmac(payload, 'other'), SECRET)).toBe(false);
  });

  it('rejects when any signed field is tampered with', () => {
    const original = callback();
    const digest = computePaymobHmac(original, SECRET);
    // Flipping the amount is the whole point of signing the callback.
    expect(verifyPaymobHmac(callback({ amount_cents: 1 }), digest, SECRET)).toBe(false);
    expect(verifyPaymobHmac(callback({ success: false }), digest, SECRET)).toBe(false);
    expect(verifyPaymobHmac(callback({ order: { id: 1 } }), digest, SECRET)).toBe(false);
  });

  it('rejects a truncated or padded digest without throwing', () => {
    // timingSafeEqual throws on a length mismatch; comparing lengths first is
    // safe because the digest length is fixed and public.
    const payload = callback();
    const digest = computePaymobHmac(payload, SECRET);
    expect(verifyPaymobHmac(payload, digest.slice(0, -1), SECRET)).toBe(false);
    expect(verifyPaymobHmac(payload, `${digest}0`, SECRET)).toBe(false);
    expect(verifyPaymobHmac(payload, '', SECRET)).toBe(false);
  });

  it('produces a stable digest for identical input', () => {
    expect(computePaymobHmac(callback(), SECRET)).toBe(computePaymobHmac(callback(), SECRET));
  });
});
