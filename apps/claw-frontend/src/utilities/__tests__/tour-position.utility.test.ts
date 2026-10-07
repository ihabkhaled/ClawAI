import { describe, expect, it } from 'vitest';

import { TOUR_POPOVER_EDGE_PX, TOUR_POPOVER_WIDTH_PX } from '@/constants/tour.constants';
import { TourPopoverSide } from '@/enums/tour-popover-side.enum';
import { computePopoverPosition, spotlightRect } from '@/utilities/tour-position.utility';

const viewport = { width: 1000, height: 800 };

describe('spotlightRect', () => {
  it('pads the target and stays inside the viewport', () => {
    expect(spotlightRect({ top: 100, left: 100, width: 50, height: 20 }, viewport)).toEqual({
      top: 94,
      left: 94,
      width: 62,
      height: 32,
    });
    expect(spotlightRect({ top: 0, left: 0, width: 2000, height: 2000 }, viewport)).toEqual({
      top: 0,
      left: 0,
      width: 1000,
      height: 800,
    });
  });
});

describe('computePopoverPosition', () => {
  it('centers without a target', () => {
    const position = computePopoverPosition(null, viewport, 200);
    expect(position.side).toBe(TourPopoverSide.Center);
    expect(position.top).toBe(300);
  });

  it('goes below when there is room', () => {
    const position = computePopoverPosition(
      { top: 100, left: 400, width: 100, height: 40 },
      viewport,
      200,
    );
    expect(position.side).toBe(TourPopoverSide.Below);
  });

  it('goes above near the bottom', () => {
    const position = computePopoverPosition(
      { top: 700, left: 400, width: 100, height: 40 },
      viewport,
      200,
    );
    expect(position.side).toBe(TourPopoverSide.Above);
  });

  it('never leaves the screen horizontally', () => {
    const atLeft = computePopoverPosition(
      { top: 100, left: 0, width: 10, height: 10 },
      viewport,
      200,
    );
    expect(atLeft.left).toBe(TOUR_POPOVER_EDGE_PX);
    const atRight = computePopoverPosition(
      { top: 100, left: 990, width: 10, height: 10 },
      viewport,
      200,
    );
    expect(atRight.left).toBe(viewport.width - TOUR_POPOVER_WIDTH_PX - TOUR_POPOVER_EDGE_PX);
  });
});
