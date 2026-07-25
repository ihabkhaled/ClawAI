import { minorToPaypalAmount, paypalAmountToMinor } from '../utilities/paypal-amount.utility';

describe('paypal amount conversion', () => {
  describe('paypalAmountToMinor', () => {
    it.each([
      ['5.00', 500],
      ['0.00', 0],
      ['0.01', 1],
      ['20.00', 2000],
      ['1000.00', 100_000],
      ['2000.00', 200_000],
    ])('parses %s to %d minor units', (value, expected) => {
      expect(paypalAmountToMinor(value)).toBe(expected);
    });

    it('treats a single decimal place as tenths, not units', () => {
      // "5.5" is five dollars fifty, not five dollars five cents. Getting this
      // wrong under-charges by a factor of ten.
      expect(paypalAmountToMinor('5.5')).toBe(550);
    });

    it('parses a whole number with no decimal point', () => {
      expect(paypalAmountToMinor('7')).toBe(700);
    });

    it.each([['5.000'], ['abc'], [''], ['-5.00'], ['5,00'], ['1e3'], ['NaN'], [' 5.00']])(
      'rejects the malformed amount %p',
      (value) => {
        expect(() => paypalAmountToMinor(value)).toThrow();
      },
    );

    it('never loses precision the way a float would', () => {
      // 0.1 + 0.2 !== 0.3 in binary floating point. Textual parsing means an
      // amount comparison cannot drift by one unit in the last place.
      expect(paypalAmountToMinor('0.10') + paypalAmountToMinor('0.20')).toBe(
        paypalAmountToMinor('0.30'),
      );
    });
  });

  describe('minorToPaypalAmount', () => {
    it.each([
      [500, '5.00'],
      [0, '0.00'],
      [1, '0.01'],
      [2000, '20.00'],
      [100_000, '1000.00'],
      [550, '5.50'],
    ])('renders %d minor units as %s', (minor, expected) => {
      expect(minorToPaypalAmount(minor)).toBe(expected);
    });

    it('rejects a negative amount', () => {
      expect(() => minorToPaypalAmount(-1)).toThrow();
    });

    it('rejects a non-integer amount', () => {
      expect(() => minorToPaypalAmount(5.5)).toThrow();
    });
  });

  it('round-trips every plan price without drift', () => {
    for (const minor of [0, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000, 200_000]) {
      expect(paypalAmountToMinor(minorToPaypalAmount(minor))).toBe(minor);
    }
  });
});
