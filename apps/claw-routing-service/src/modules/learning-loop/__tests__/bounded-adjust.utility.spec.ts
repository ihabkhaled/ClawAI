import { SUCCESS_RATE_CEILING, SUCCESS_RATE_FLOOR } from '../constants/learning-loop.constants';
import { boundedAdjust } from '../utilities/bounded-adjust.utility';

describe('boundedAdjust', () => {
  it('floors at SUCCESS_RATE_FLOOR', () => {
    expect(boundedAdjust(0.31, -0.5)).toBe(SUCCESS_RATE_FLOOR);
  });

  it('ceilings at SUCCESS_RATE_CEILING', () => {
    expect(boundedAdjust(0.9, 0.5)).toBe(SUCCESS_RATE_CEILING);
  });

  it('returns rounded value within bounds', () => {
    expect(boundedAdjust(0.5, 0.02)).toBe(0.52);
  });

  it('5 consecutive thumbs-down on a 0.85 model does NOT drop below floor', () => {
    let r = 0.85;
    for (let i = 0; i < 5; i += 1) r = boundedAdjust(r, -0.03);
    expect(r).toBeGreaterThanOrEqual(SUCCESS_RATE_FLOOR);
  });

  it('many positive signals plateau at ceiling', () => {
    let r = 0.6;
    for (let i = 0; i < 100; i += 1) r = boundedAdjust(r, 0.02);
    expect(r).toBe(SUCCESS_RATE_CEILING);
  });
});
