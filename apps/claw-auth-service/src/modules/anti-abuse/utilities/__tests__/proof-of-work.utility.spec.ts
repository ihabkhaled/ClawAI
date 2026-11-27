import { createHash } from 'node:crypto';

import { BotCheckReason } from '../../enums/bot-check-reason.enum';
import {
  countLeadingZeroBits,
  meetsDifficulty,
  readPowToken,
  signPowPayload,
} from '../proof-of-work.utility';

const KEY = 'k'.repeat(64);
const SALT = '0123456789abcdef0123456789abcdef';
const PAYLOAD = { v: 1, salt: SALT, difficulty: 12, exp: Date.parse('2026-11-27T10:05:00Z') };

describe('proof-of-work utilities', () => {
  it('counts leading zero bits across bytes', () => {
    expect(countLeadingZeroBits(Uint8Array.from([0x80]))).toBe(0);
    expect(countLeadingZeroBits(Uint8Array.from([0x01]))).toBe(7);
    expect(countLeadingZeroBits(Uint8Array.from([0x00, 0x0f]))).toBe(12);
    expect(countLeadingZeroBits(Uint8Array.from([0x00, 0x00]))).toBe(16);
  });

  it('checks the hash of salt + nonce against the difficulty', () => {
    let nonce = 0;
    while (!meetsDifficulty(SALT, String(nonce), 8)) {
      nonce += 1;
    }
    const digest = createHash('sha256').update(`${SALT}${nonce}`).digest();
    expect(digest[0]).toBe(0);
    expect(meetsDifficulty(SALT, String(nonce), 8)).toBe(true);
  });

  it('round-trips a signed payload', () => {
    const token = signPowPayload(PAYLOAD, KEY);
    expect(readPowToken(token, KEY)).toEqual({ payload: PAYLOAD });
  });

  it('refuses a token signed with another key or edited after signing', () => {
    const token = signPowPayload(PAYLOAD, KEY);
    expect(readPowToken(token, 'other-key')).toEqual({ failure: BotCheckReason.POW_BAD_SIGNATURE });
    const [, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...PAYLOAD, difficulty: 1 })).toString('base64url');
    expect(readPowToken(`${forged}.${signature}`, KEY)).toEqual({
      failure: BotCheckReason.POW_BAD_SIGNATURE,
    });
  });

  it('refuses malformed tokens and foreign shapes', () => {
    expect(readPowToken('no-dot', KEY)).toEqual({ failure: BotCheckReason.POW_MALFORMED });
    expect(readPowToken('a.b.c', KEY)).toEqual({ failure: BotCheckReason.POW_MALFORMED });
    const wrongVersion = signPowPayload({ ...PAYLOAD, v: 2 }, KEY);
    expect(readPowToken(wrongVersion, KEY)).toEqual({ failure: BotCheckReason.POW_MALFORMED });
  });
});
