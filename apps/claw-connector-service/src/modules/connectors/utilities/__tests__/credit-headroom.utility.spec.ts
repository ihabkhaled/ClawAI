import { ConnectorCreditHeadroomFormat } from '@claw/shared-types';

import {
  combineCreditHeadroom,
  parseCreditHeadroom,
  usdAmountToMicroUsdFloor,
} from '../credit-headroom.utility';

describe('usdAmountToMicroUsdFloor', () => {
  it('converts USD to integer micro-USD, flooring', () => {
    expect(usdAmountToMicroUsdFloor(0.0213)).toBe(21_300);
    expect(usdAmountToMicroUsdFloor(12)).toBe(12_000_000);
    expect(usdAmountToMicroUsdFloor(0.0000019)).toBe(1);
  });

  it('never rounds binary noise up', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in binary floating point.
    expect(usdAmountToMicroUsdFloor(0.1 + 0.2)).toBe(300_000);
    expect(usdAmountToMicroUsdFloor(0.9999999)).toBe(999_999);
  });

  it('reads an exponent-form tiny balance', () => {
    expect(usdAmountToMicroUsdFloor(2.5e-7)).toBe(0);
    expect(usdAmountToMicroUsdFloor(3e-6)).toBe(3);
  });

  it('floors a negative balance at zero and rejects non-numbers', () => {
    expect(usdAmountToMicroUsdFloor(-0.5)).toBe(0);
    expect(usdAmountToMicroUsdFloor('0.5')).toBeUndefined();
    expect(usdAmountToMicroUsdFloor(Number.NaN)).toBeUndefined();
    expect(usdAmountToMicroUsdFloor(null)).toBeUndefined();
  });
});

describe('parseCreditHeadroom — OpenRouter', () => {
  const parse = (data: unknown) =>
    parseCreditHeadroom(ConnectorCreditHeadroomFormat.OPENROUTER, data);

  it('reads /key limit_remaining', () => {
    expect(parse({ data: { label: 'k', limit: 5, limit_remaining: 0.0213, usage: 4.97 } })).toEqual(
      { known: true, remainingMicroUsd: 21_300 },
    );
  });

  it('treats a null limit_remaining as an unlimited key', () => {
    expect(parse({ data: { limit: null, limit_remaining: null, usage: 1 } })).toEqual({
      known: true,
      remainingMicroUsd: null,
    });
  });

  it('reads /credits as total_credits - total_usage, floored at zero', () => {
    expect(parse({ data: { total_credits: 10, total_usage: 9.75 } })).toEqual({
      known: true,
      remainingMicroUsd: 250_000,
    });
    expect(parse({ data: { total_credits: 1, total_usage: 2 } })).toEqual({
      known: true,
      remainingMicroUsd: 0,
    });
  });

  it('is unknown for any other shape', () => {
    expect(parse({})).toEqual({ known: false, remainingMicroUsd: null });
    expect(parse({ data: { limit_remaining: '5' } })).toEqual({
      known: false,
      remainingMicroUsd: null,
    });
    expect(parse(null)).toEqual({ known: false, remainingMicroUsd: null });
  });
});

describe('combineCreditHeadroom', () => {
  it('the smallest known balance binds', () => {
    expect(
      combineCreditHeadroom([
        { known: true, remainingMicroUsd: 500 },
        { known: true, remainingMicroUsd: 200 },
        { known: false, remainingMicroUsd: null },
      ]),
    ).toEqual({ known: true, remainingMicroUsd: 200 });
  });

  it('a limited balance beats an unlimited key', () => {
    expect(
      combineCreditHeadroom([
        { known: true, remainingMicroUsd: null },
        { known: true, remainingMicroUsd: 900 },
      ]),
    ).toEqual({ known: true, remainingMicroUsd: 900 });
  });

  it('unlimited when every known reading is unlimited', () => {
    expect(
      combineCreditHeadroom([
        { known: true, remainingMicroUsd: null },
        { known: false, remainingMicroUsd: null },
      ]),
    ).toEqual({ known: true, remainingMicroUsd: null });
  });

  it('unknown when nothing was read', () => {
    expect(combineCreditHeadroom([])).toEqual({ known: false, remainingMicroUsd: null });
  });
});
