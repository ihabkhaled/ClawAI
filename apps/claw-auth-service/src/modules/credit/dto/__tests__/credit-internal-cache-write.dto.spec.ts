import { PaygSurface } from '@claw/shared-types';

import { CREDIT_TOKEN_COUNT_MAX } from '../../constants/credit.constants';
import { finalizeCreditSchema, reserveCreditSchema } from '../credit-internal.dto';

// F093: the two additive prompt-cache fields. Optional so every caller that
// predates them is unchanged, and bounded non-negative integers so a fractional,
// negative or huge count never reaches the price arithmetic.

const RESERVE_BASE = {
  userId: 'user-1',
  requestId: 'req-1',
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4',
  surface: PaygSurface.CHAT,
  promptTokens: 8000,
  cachedPromptTokens: 0,
  requestedMaxOutputTokens: 2000,
};

const FINALIZE_BASE = {
  reservationId: '6f1d2c1e-8a8e-4b53-9f3e-2f4f5f7d9a10',
  usage: { promptTokens: 8012, completionTokens: 450, cachedPromptTokens: 0, reasoningTokens: 0 },
};

describe('reserveCreditSchema: cacheWritePromptTokens', () => {
  it('defaults to 0 when an older caller omits it', () => {
    expect(reserveCreditSchema.parse(RESERVE_BASE).cacheWritePromptTokens).toBe(0);
  });

  it('accepts a bounded non-negative integer', () => {
    expect(
      reserveCreditSchema.parse({ ...RESERVE_BASE, cacheWritePromptTokens: 8000 })
        .cacheWritePromptTokens,
    ).toBe(8000);
    expect(
      reserveCreditSchema.safeParse({
        ...RESERVE_BASE,
        cacheWritePromptTokens: CREDIT_TOKEN_COUNT_MAX,
      }).success,
    ).toBe(true);
  });

  it.each([-1, 1.5, CREDIT_TOKEN_COUNT_MAX + 1, '8000', null, Number.NaN])('rejects %s', (bad) => {
    expect(
      reserveCreditSchema.safeParse({ ...RESERVE_BASE, cacheWritePromptTokens: bad }).success,
    ).toBe(false);
  });
});

describe('finalizeCreditSchema: usage.cacheCreationPromptTokens', () => {
  it('defaults to 0 when an older caller omits it', () => {
    expect(finalizeCreditSchema.parse(FINALIZE_BASE).usage.cacheCreationPromptTokens).toBe(0);
  });

  it('accepts a bounded non-negative integer', () => {
    const parsed = finalizeCreditSchema.parse({
      ...FINALIZE_BASE,
      usage: { ...FINALIZE_BASE.usage, cacheCreationPromptTokens: 8000 },
    });
    expect(parsed.usage.cacheCreationPromptTokens).toBe(8000);
  });

  it.each([-1, 1.5, CREDIT_TOKEN_COUNT_MAX + 1, '8000', null, Number.NaN])('rejects %s', (bad) => {
    expect(
      finalizeCreditSchema.safeParse({
        ...FINALIZE_BASE,
        usage: { ...FINALIZE_BASE.usage, cacheCreationPromptTokens: bad },
      }).success,
    ).toBe(false);
  });
});
