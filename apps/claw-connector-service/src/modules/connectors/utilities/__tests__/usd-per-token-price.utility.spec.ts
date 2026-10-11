import {
  microUsdToUsdPerMillionText,
  usdPerMillionToMicroUsd,
  usdPerTokenToMicroUsdPerMTok,
} from '../usd-per-token-price.utility';

describe('usdPerTokenToMicroUsdPerMTok', () => {
  it.each([
    ['0.000003', 3_000_000],
    ['0.000015', 15_000_000],
    ['1.5e-7', 150_000],
    ['1.5E-7', 150_000],
    ['0', 0],
    ['0.0', 0],
    ['0.001', 1_000_000_000],
    [' 0.000003 ', 3_000_000],
    ['0.0000000000004', 0],
    ['0.0000000000005', 1],
  ])('converts %s to %s', (input, expected) => {
    expect(usdPerTokenToMicroUsdPerMTok(input)).toBe(expected);
  });

  it('accepts a number by its decimal text', () => {
    expect(usdPerTokenToMicroUsdPerMTok(0.000003)).toBe(3_000_000);
  });

  it.each(['-1', '', ' ', 'NaN', 'abc', '-0.5', '1e999', '0.002', '5', null, undefined])(
    'gives no price for %s',
    (input) => {
      expect(usdPerTokenToMicroUsdPerMTok(input)).toBeNull();
    },
  );
});

describe('price text round trip', () => {
  it('formats micro-USD as the USD-per-million column text', () => {
    expect(microUsdToUsdPerMillionText(3_000_000)).toBe('3.000000');
    expect(microUsdToUsdPerMillionText(150_000)).toBe('0.150000');
    expect(microUsdToUsdPerMillionText(0)).toBe('0.000000');
  });

  it('reads a stored Decimal back to integer micro-USD', () => {
    expect(usdPerMillionToMicroUsd({ toFixed: () => '3.000000' })).toBe(3_000_000);
    expect(usdPerMillionToMicroUsd({ toFixed: () => '0.150000' })).toBe(150_000);
    expect(usdPerMillionToMicroUsd(null)).toBeUndefined();
  });
});
