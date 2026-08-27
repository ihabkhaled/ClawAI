import { describe, expect, it } from 'vitest';

import { resolveFloatingClearance } from '@/utilities/floating-obstacle-clearance.utility';

const VIEWPORT_HEIGHT = 861;
const GAP = 12;

// Measured from the live app at 929x861: the toast column occupies x 509-929,
// the feedback launcher 861-913 x 797-837, and the PWA install prompt
// 209-721 x 670-829. Both overlapped the toast column.
const TOAST_COLUMN = { columnLeft: 509, columnRight: 929 };
const FEEDBACK_LAUNCHER = { top: 797, bottom: 837, left: 861, right: 913 };
const INSTALL_PROMPT = { top: 670, bottom: 829, left: 209, right: 721 };

const base = { ...TOAST_COLUMN, viewportHeight: VIEWPORT_HEIGHT, gapPx: GAP };

describe('resolveFloatingClearance', () => {
  it('reserves nothing when nothing floats', () => {
    expect(resolveFloatingClearance({ ...base, obstacles: [] })).toBe(0);
  });

  it('clears the feedback launcher that toasts used to cover', () => {
    const clearance = resolveFloatingClearance({ ...base, obstacles: [FEEDBACK_LAUNCHER] });

    expect(clearance).toBe(VIEWPORT_HEIGHT - FEEDBACK_LAUNCHER.top + GAP);
  });

  it('clears the tallest obstacle, not the last one seen', () => {
    const clearance = resolveFloatingClearance({
      ...base,
      obstacles: [FEEDBACK_LAUNCHER, INSTALL_PROMPT],
    });

    expect(clearance).toBe(VIEWPORT_HEIGHT - INSTALL_PROMPT.top + GAP);
  });

  it('ignores an element pinned to the opposite corner', () => {
    // Pushing toasts up for something they never touch reads as a bug.
    const farLeft = { top: 700, bottom: 760, left: 16, right: 200 };

    expect(resolveFloatingClearance({ ...base, obstacles: [farLeft] })).toBe(0);
  });

  it('ignores a hidden element with no area', () => {
    const collapsed = { top: 0, bottom: 0, left: 0, right: 0 };

    expect(resolveFloatingClearance({ ...base, obstacles: [collapsed] })).toBe(0);
  });

  it('ignores an obstacle scrolled entirely above the viewport', () => {
    const offScreen = { top: -200, bottom: -40, left: 600, right: 800 };

    expect(resolveFloatingClearance({ ...base, obstacles: [offScreen] })).toBe(0);
  });

  it('never pushes toasts past half the viewport, however tall the obstacle', () => {
    const fullHeightPanel = { top: 0, bottom: VIEWPORT_HEIGHT, left: 600, right: 900 };

    expect(resolveFloatingClearance({ ...base, obstacles: [fullHeightPanel] })).toBe(
      VIEWPORT_HEIGHT * 0.5,
    );
  });

  it('treats a mirrored (RTL) layout the same way, by overlap rather than by side', () => {
    // Same launcher, mirrored to the left edge, with the toast column mirrored
    // with it. Still overlapping, so still cleared.
    const clearance = resolveFloatingClearance({
      obstacles: [{ top: 797, bottom: 837, left: 16, right: 68 }],
      columnLeft: 0,
      columnRight: 420,
      viewportHeight: VIEWPORT_HEIGHT,
      gapPx: GAP,
    });

    expect(clearance).toBe(VIEWPORT_HEIGHT - 797 + GAP);
  });
});
