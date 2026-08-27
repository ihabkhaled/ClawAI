import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FLOATING_CLEARANCE_VARIABLE } from '@/constants/floating-obstacle.constants';
import { useFloatingObstacleClearance } from '@/hooks/layout/use-floating-obstacle-clearance';

// jsdom reports every box as 0x0, so the numbers here come from stubs. The
// point of these tests is the lifecycle — whether a measurement happens at all
// — not the arithmetic, which `floating-obstacle-clearance.utility.test.ts`
// owns.
function stubRect(element: Element, rect: Partial<DOMRect>): void {
  element.getBoundingClientRect = () =>
    ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, ...rect }) as DOMRect;
}

function makeViewport(): HTMLElement {
  const viewport = document.createElement('ol');
  stubRect(viewport, { left: 500, right: 930, top: 800, bottom: 860 });
  document.body.appendChild(viewport);
  return viewport;
}

function makeObstacle(): HTMLElement {
  const obstacle = document.createElement('button');
  obstacle.setAttribute('data-floating-obstacle', '');
  stubRect(obstacle, { left: 860, right: 912, top: 796, bottom: 836 });
  document.body.appendChild(obstacle);
  return obstacle;
}

async function flushFrames(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useFloatingObstacleClearance', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (handle: number) =>
      clearTimeout(handle as unknown as NodeJS.Timeout),
    );
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.style.removeProperty(FLOATING_CLEARANCE_VARIABLE);
    vi.unstubAllGlobals();
  });

  it('writes the measured clearance into the custom property', async () => {
    const viewport = makeViewport();
    makeObstacle();

    renderHook(() => useFloatingObstacleClearance({ current: viewport }));
    await flushFrames();

    // A pixel value, not the arithmetic: the number is the utility's test.
    expect(document.documentElement.style.getPropertyValue(FLOATING_CLEARANCE_VARIABLE)).toMatch(
      /^\d+px$/,
    );
  });

  it('measures again after a remount, rather than dying on a stale frame handle', async () => {
    // The cleanup cancels a pending frame. If it leaves the handle behind, the
    // next mount's scheduler sees "a measurement is already queued" and returns
    // — permanently. That made the toast column stop dodging anything after the
    // first route change, which is the whole feature.
    const viewport = makeViewport();
    makeObstacle();

    const first = renderHook(() => useFloatingObstacleClearance({ current: viewport }));
    first.unmount();

    expect(document.documentElement.style.getPropertyValue(FLOATING_CLEARANCE_VARIABLE)).toBe('');

    renderHook(() => useFloatingObstacleClearance({ current: viewport }));
    await flushFrames();

    expect(document.documentElement.style.getPropertyValue(FLOATING_CLEARANCE_VARIABLE)).toMatch(
      /^\d+px$/,
    );
  });

  it('clears the property on unmount, so a page without a toaster keeps its space', async () => {
    const viewport = makeViewport();
    makeObstacle();

    const { unmount } = renderHook(() => useFloatingObstacleClearance({ current: viewport }));
    await flushFrames();
    unmount();

    expect(document.documentElement.style.getPropertyValue(FLOATING_CLEARANCE_VARIABLE)).toBe('');
  });
});
