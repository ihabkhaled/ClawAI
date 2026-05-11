import { countBy, meanOf, shareWhere } from '../utilities/count-by.utility';

describe('countBy', () => {
  it('counts rows by extracted key', () => {
    const result = countBy([{ p: 'A' }, { p: 'A' }, { p: 'B' }], (r) => r.p);
    expect(result).toEqual({ A: 2, B: 1 });
  });

  it('skips null + undefined + empty-string keys', () => {
    const result = countBy(
      [{ p: 'A' }, { p: null }, { p: undefined }, { p: '' }],
      (r) => r.p as string | null | undefined,
    );
    expect(result).toEqual({ A: 1 });
  });
});

describe('meanOf', () => {
  it('computes arithmetic mean over numeric field', () => {
    const result = meanOf([{ x: 1 }, { x: 2 }, { x: 3 }], (r) => r.x);
    expect(result).toBe(2);
  });

  it('skips null + undefined + NaN', () => {
    const result = meanOf(
      [{ x: 2 }, { x: null }, { x: 4 }, { x: Number.NaN }] as Array<{ x: number | null }>,
      (r) => r.x,
    );
    expect(result).toBe(3);
  });

  it('empty input → 0', () => {
    expect(meanOf([], (r) => (r as unknown as { x: number }).x)).toBe(0);
  });
});

describe('shareWhere', () => {
  it('returns share of matching predicate', () => {
    expect(shareWhere([1, 2, 3, 4], (n) => n > 2)).toBe(0.5);
  });

  it('empty input → 0', () => {
    expect(shareWhere([], () => true)).toBe(0);
  });

  it('all match → 1', () => {
    expect(shareWhere([1, 2, 3], () => true)).toBe(1);
  });
});
