import {
  blindIndexGatewayToken,
  blindIndexMatches,
  decryptGatewayToken,
  encryptGatewayToken,
  readEnvelopeKeyVersion,
} from '../token-vault.utility';

const KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);
const TOKEN = 'pmt_tok_live_9f3a2c8e4b1d';

const CONTEXT = { userId: 'user-1', gateway: 'PAYMOB', paymentMethodId: 'pm-1' };

describe('token-vault', () => {
  describe('round trip', () => {
    it('decrypts back to the original token', () => {
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);

      expect(decryptGatewayToken(envelope, KEY, CONTEXT)).toBe(TOKEN);
    });

    it('never stores the plaintext in the envelope', () => {
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);

      expect(envelope).not.toContain(TOKEN);
      expect(envelope).not.toContain('pmt_tok');
    });

    it('produces a DIFFERENT ciphertext every time for the same input', () => {
      // A fresh random nonce per value. Reusing a nonce under one key in GCM leaks
      // the XOR of plaintexts and enables forgery, so determinism here would be a
      // real vulnerability rather than a cosmetic issue.
      const first = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);
      const second = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);

      expect(first).not.toBe(second);
      expect(decryptGatewayToken(first, KEY, CONTEXT)).toBe(TOKEN);
      expect(decryptGatewayToken(second, KEY, CONTEXT)).toBe(TOKEN);
    });
  });

  describe('context binding (AAD)', () => {
    it('refuses to decrypt under a different user', () => {
      // The control that matters most: a ciphertext lifted into another user's row
      // must fail closed rather than authorise a charge against the wrong person.
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);

      expect(() =>
        decryptGatewayToken(envelope, KEY, { ...CONTEXT, userId: 'attacker' }),
      ).toThrow();
    });

    it('refuses to decrypt under a different payment method id', () => {
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);

      expect(() =>
        decryptGatewayToken(envelope, KEY, { ...CONTEXT, paymentMethodId: 'pm-2' }),
      ).toThrow();
    });

    it('refuses to decrypt under a different gateway', () => {
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);

      expect(() => decryptGatewayToken(envelope, KEY, { ...CONTEXT, gateway: 'PAYPAL' })).toThrow();
    });
  });

  describe('tamper detection', () => {
    it('refuses a ciphertext modified by a single character', () => {
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);
      const parts = envelope.split('.');
      const cipher = parts[3] ?? '';
      parts[3] = `${cipher.slice(0, -1)}${cipher.at(-1) === 'A' ? 'B' : 'A'}`;

      expect(() => decryptGatewayToken(parts.join('.'), KEY, CONTEXT)).toThrow();
    });

    it('refuses a stripped or altered auth tag', () => {
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);
      const parts = envelope.split('.');
      parts[2] = Buffer.alloc(16).toString('base64url');

      expect(() => decryptGatewayToken(parts.join('.'), KEY, CONTEXT)).toThrow();
    });

    it('refuses the wrong key', () => {
      const envelope = encryptGatewayToken(TOKEN, KEY, 1, CONTEXT);

      expect(() => decryptGatewayToken(envelope, OTHER_KEY, CONTEXT)).toThrow();
    });

    it.each([
      ['empty', ''],
      ['not an envelope', 'garbage'],
      ['too few fields', 'v1.abc.def'],
      ['missing version marker', 'x.y.z.w'],
    ])('refuses a malformed envelope (%s)', (_label, envelope) => {
      expect(() => decryptGatewayToken(envelope, KEY, CONTEXT)).toThrow();
    });
  });

  describe('key rotation', () => {
    it('records the key version so old rows stay decryptable', () => {
      // Rotation writes new values under the new version while existing rows keep
      // theirs; without the marker a rotation would be an outage.
      const envelope = encryptGatewayToken(TOKEN, KEY, 7, CONTEXT);

      expect(readEnvelopeKeyVersion(envelope)).toBe(7);
      expect(envelope.startsWith('v7.')).toBe(true);
    });

    it('returns null for an envelope with no readable version', () => {
      expect(readEnvelopeKeyVersion('garbage')).toBeNull();
    });
  });

  describe('blind index', () => {
    it('is deterministic for the same token, so a duplicate can be rejected', () => {
      // This is what makes the (userId, gateway, tokenBlindIndex) unique constraint
      // able to say "this card is already saved" without comparing plaintext.
      expect(blindIndexGatewayToken(TOKEN, KEY)).toBe(blindIndexGatewayToken(TOKEN, KEY));
    });

    it('differs for a different token', () => {
      expect(blindIndexGatewayToken(TOKEN, KEY)).not.toBe(
        blindIndexGatewayToken('pmt_tok_other', KEY),
      );
    });

    it('is keyed — useless to anyone holding only the database', () => {
      // A bare hash of a low-entropy token is enumerable; the key is what stops
      // an attacker with table access confirming candidate tokens.
      expect(blindIndexGatewayToken(TOKEN, KEY)).not.toBe(blindIndexGatewayToken(TOKEN, OTHER_KEY));
    });

    it('never contains the token', () => {
      expect(blindIndexGatewayToken(TOKEN, KEY)).not.toContain(TOKEN);
    });

    it('compares equal indexes as matching and different ones as not', () => {
      const index = blindIndexGatewayToken(TOKEN, KEY);

      expect(blindIndexMatches(index, index)).toBe(true);
      expect(blindIndexMatches(index, blindIndexGatewayToken('other', KEY))).toBe(false);
    });

    it('handles a length mismatch without throwing', () => {
      // timingSafeEqual throws on unequal lengths; the guard must absorb that.
      expect(blindIndexMatches('short', blindIndexGatewayToken(TOKEN, KEY))).toBe(false);
    });
  });

  describe('key validation', () => {
    it.each([
      ['too short', 'abc'],
      ['not hex', 'z'.repeat(64)],
      ['empty', ''],
    ])('rejects a key that is %s', (_label, key) => {
      expect(() => encryptGatewayToken(TOKEN, key, 1, CONTEXT)).toThrow();
    });
  });
});
