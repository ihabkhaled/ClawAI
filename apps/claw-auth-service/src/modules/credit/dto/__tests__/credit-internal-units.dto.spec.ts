import { PaygSurface } from '@claw/shared-types';

import {
  CREDIT_AUDIO_SECONDS_MAX,
  CREDIT_IMAGE_UNITS_MAX,
  CREDIT_TTS_CHARACTERS_MAX,
} from '../../constants/credit.constants';
import { finalizeCreditSchema, reserveCreditSchema } from '../credit-internal.dto';

// The unit-metering fields on the two money-moving internal routes. They are
// optional (old callers unchanged) and bounded non-negative integers (a
// fractional, negative or huge count must never reach the price arithmetic).

const RESERVE_BASE = {
  userId: 'user-1',
  requestId: 'gen-1',
  provider: 'OPENAI',
  model: 'gpt-image-1',
  surface: PaygSurface.IMAGE,
  promptTokens: 0,
  cachedPromptTokens: 0,
  requestedMaxOutputTokens: 8192,
};

const FINALIZE_BASE = {
  reservationId: '6f1d2c1e-8a8e-4b53-9f3e-2f4f5f7d9a10',
  usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
};

const UNIT_FIELDS = [
  ['imageUnits', CREDIT_IMAGE_UNITS_MAX],
  ['audioSeconds', CREDIT_AUDIO_SECONDS_MAX],
  ['ttsCharacters', CREDIT_TTS_CHARACTERS_MAX],
] as const;

describe('credit internal DTOs — unit counts', () => {
  it('defaults every unit count to 0 when a caller omits them (old payloads)', () => {
    expect(reserveCreditSchema.parse(RESERVE_BASE)).toMatchObject({
      imageUnits: 0,
      audioSeconds: 0,
      ttsCharacters: 0,
    });
    expect(finalizeCreditSchema.parse(FINALIZE_BASE)).toMatchObject({
      toolCalls: 0,
      searchCalls: 0,
      imageUnits: 0,
      audioSeconds: 0,
      ttsCharacters: 0,
    });
  });

  describe.each(UNIT_FIELDS)('%s', (field, max) => {
    it('accepts a count at its ceiling', () => {
      expect(reserveCreditSchema.safeParse({ ...RESERVE_BASE, [field]: max }).success).toBe(true);
      expect(finalizeCreditSchema.safeParse({ ...FINALIZE_BASE, [field]: max }).success).toBe(true);
    });

    it.each([
      ['negative', -1],
      ['fractional', 1.5],
      ['over the ceiling', max + 1],
      ['overflowing', Number.MAX_SAFE_INTEGER],
      ['infinite', Number.POSITIVE_INFINITY],
      ['NaN', Number.NaN],
      ['a numeric string', '1'],
      ['null', null],
    ])('rejects %s', (_label, value) => {
      expect(reserveCreditSchema.safeParse({ ...RESERVE_BASE, [field]: value }).success).toBe(
        false,
      );
      expect(finalizeCreditSchema.safeParse({ ...FINALIZE_BASE, [field]: value }).success).toBe(
        false,
      );
    });
  });
});
