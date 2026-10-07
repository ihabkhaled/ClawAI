import { describe, expect, it } from 'vitest';

import { microUsdToUsdInput, usdInputToMicroUsd } from '@/utilities/micro-usd-input.utility';

describe('usdInputToMicroUsd', () => {
  it.each([
    ['0.25', 250_000],
    ['5', 5_000_000],
    ['0', 0],
    ['0.07', 70_000],
    ['0.000001', 1],
    ['12.345678', 12_345_678],
    [' 3 ', 3_000_000],
    [0.1, 100_000],
  ])('turns %s into %i without float error', (input, micro) => {
    expect(usdInputToMicroUsd(input)).toBe(micro);
  });

  it('treats blank, null and undefined as "none"', () => {
    expect(usdInputToMicroUsd('')).toBeNull();
    expect(usdInputToMicroUsd('   ')).toBeNull();
    expect(usdInputToMicroUsd(null)).toBeNull();
    expect(usdInputToMicroUsd(undefined)).toBeNull();
  });

  it.each(['-1', '1.0000001', 'abc', '1,5', '$5', '1e3', '.5', '5.', '1000.000001', {}, []])(
    'rejects %s as invalid',
    (input) => {
      expect(usdInputToMicroUsd(input)).toBeUndefined();
    },
  );

  it('accepts exactly the upper bound of 1000 dollars', () => {
    expect(usdInputToMicroUsd('1000')).toBe(1_000_000_000);
  });
});

describe('microUsdToUsdInput', () => {
  it.each([
    [250_000, '0.25'],
    [5_000_000, '5'],
    [0, '0'],
    [70_000, '0.07'],
    [1, '0.000001'],
    [12_345_678, '12.345678'],
  ])('shows %i as %s', (micro, text) => {
    expect(microUsdToUsdInput(micro)).toBe(text);
  });

  it('shows none as blank', () => {
    expect(microUsdToUsdInput(null)).toBe('');
    expect(microUsdToUsdInput(undefined)).toBe('');
  });

  it('round-trips every amount an admin can type', () => {
    for (const text of ['0.25', '5', '0.07', '12.345678', '999.999999']) {
      expect(microUsdToUsdInput(usdInputToMicroUsd(text) as number)).toBe(text);
    }
  });
});
