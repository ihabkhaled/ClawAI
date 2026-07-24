import {
  buildIdempotencyScope,
  concatenateOrderedFields,
  hashRequestPayload,
  hashWebhookPayload,
  isOutsideReplayWindow,
  secureCompare,
} from '../idempotency-key.utility';

describe('idempotency-key.utility', () => {
  describe('hashRequestPayload', () => {
    it('produces a stable sha256 hex digest', () => {
      const digest = hashRequestPayload({ planId: 'plan_1', interval: 'MONTHLY' });
      expect(digest).toMatch(/^[\da-f]{64}$/);
      expect(hashRequestPayload({ planId: 'plan_1', interval: 'MONTHLY' })).toBe(digest);
    });

    it('ignores property order, so a reordered body is still the same request', () => {
      expect(hashRequestPayload({ a: 1, b: 2 })).toBe(hashRequestPayload({ b: 2, a: 1 }));
    });

    it('ignores property order at every depth', () => {
      expect(hashRequestPayload({ outer: { a: 1, b: { c: 3, d: 4 } } })).toBe(
        hashRequestPayload({ outer: { b: { d: 4, c: 3 }, a: 1 } }),
      );
    });

    it('distinguishes a genuinely different body', () => {
      // Replaying a key with a DIFFERENT body is an error, not a replay: this is
      // what makes that detectable.
      expect(hashRequestPayload({ planId: 'plan_1' })).not.toBe(
        hashRequestPayload({ planId: 'plan_2' }),
      );
    });

    it('distinguishes a changed amount', () => {
      expect(hashRequestPayload({ amountMinor: 2000 })).not.toBe(
        hashRequestPayload({ amountMinor: 2001 }),
      );
    });

    it('respects array order, which is semantically meaningful', () => {
      expect(hashRequestPayload({ items: [1, 2] })).not.toBe(hashRequestPayload({ items: [2, 1] }));
    });

    it('treats an omitted key and an explicit undefined as the same request', () => {
      expect(hashRequestPayload({ a: 1, b: undefined })).toBe(hashRequestPayload({ a: 1 }));
    });

    it('distinguishes null from undefined', () => {
      expect(hashRequestPayload({ a: null })).not.toBe(hashRequestPayload({}));
    });

    it('distinguishes a numeric value from its string form', () => {
      expect(hashRequestPayload({ amountMinor: 2000 })).not.toBe(
        hashRequestPayload({ amountMinor: '2000' }),
      );
    });

    it('handles primitives and empty structures', () => {
      for (const value of [null, 0, '', false, [], {}]) {
        expect(hashRequestPayload(value)).toMatch(/^[\da-f]{64}$/);
      }
    });
  });

  describe('buildIdempotencyScope', () => {
    it('scopes a key by user and operation', () => {
      expect(buildIdempotencyScope('user_1', 'createCheckout', 'key_a')).toBe(
        'user_1:createCheckout:key_a',
      );
    });

    it('keeps the same key distinct across users', () => {
      // Without user scoping, one user's key could replay another's operation.
      expect(buildIdempotencyScope('user_1', 'createCheckout', 'k')).not.toBe(
        buildIdempotencyScope('user_2', 'createCheckout', 'k'),
      );
    });

    it('keeps the same key distinct across operations', () => {
      expect(buildIdempotencyScope('user_1', 'createCheckout', 'k')).not.toBe(
        buildIdempotencyScope('user_1', 'refund', 'k'),
      );
    });
  });

  describe('hashWebhookPayload', () => {
    it('fingerprints a raw body without retaining it', () => {
      const digest = hashWebhookPayload('{"event_type":"PAYMENT.CAPTURE.COMPLETED"}');
      expect(digest).toMatch(/^[\da-f]{64}$/);
    });

    it('detects a single-byte difference', () => {
      expect(hashWebhookPayload('{"a":1}')).not.toBe(hashWebhookPayload('{"a":2}'));
    });

    it('hashes an empty body without throwing', () => {
      expect(hashWebhookPayload('')).toMatch(/^[\da-f]{64}$/);
    });
  });

  describe('secureCompare', () => {
    it('accepts identical values', () => {
      expect(secureCompare('abc123', 'abc123')).toBe(true);
    });

    it('rejects different values', () => {
      expect(secureCompare('abc123', 'abc124')).toBe(false);
    });

    it('rejects values differing only in length without short-circuiting', () => {
      // Digesting both sides first means a length mismatch does not return
      // faster than a content mismatch.
      expect(secureCompare('abc', 'abcdef')).toBe(false);
      expect(secureCompare('', 'a')).toBe(false);
    });

    it('accepts two empty strings', () => {
      expect(secureCompare('', '')).toBe(true);
    });

    it('is case sensitive', () => {
      expect(secureCompare('ABC', 'abc')).toBe(false);
    });

    it('handles unicode without throwing', () => {
      expect(secureCompare('sig-✓', 'sig-✓')).toBe(true);
      expect(secureCompare('sig-✓', 'sig-✗')).toBe(false);
    });
  });

  describe('concatenateOrderedFields', () => {
    it('concatenates in the caller-supplied order, not object order', () => {
      const source = { amount: '500', currency: 'EGP', id: '42' };
      expect(concatenateOrderedFields(source, ['id', 'amount', 'currency'])).toBe('42500EGP');
    });

    it('substitutes an empty string for a missing field', () => {
      // Gateways that sign a field list expect a placeholder, not a gap.
      expect(concatenateOrderedFields({ a: '1' }, ['a', 'missing', 'b'])).toBe('1');
    });

    it('produces an empty string for an empty order', () => {
      expect(concatenateOrderedFields({ a: '1' }, [])).toBe('');
    });

    it('is order sensitive', () => {
      const source = { a: '1', b: '2' };
      expect(concatenateOrderedFields(source, ['a', 'b'])).not.toBe(
        concatenateOrderedFields(source, ['b', 'a']),
      );
    });
  });

  describe('isOutsideReplayWindow', () => {
    it('accepts a request inside the tolerance', () => {
      expect(isOutsideReplayWindow(1000, 1500, 600)).toBe(false);
    });

    it('rejects a request older than the tolerance', () => {
      expect(isOutsideReplayWindow(1000, 2000, 600)).toBe(true);
    });

    it('rejects a request dated too far in the future', () => {
      // Guards against a forged forward-dated timestamp extending replay life.
      expect(isOutsideReplayWindow(3000, 1000, 600)).toBe(true);
    });

    it('accepts the exact tolerance boundary', () => {
      expect(isOutsideReplayWindow(1000, 1600, 600)).toBe(false);
    });
  });
});
