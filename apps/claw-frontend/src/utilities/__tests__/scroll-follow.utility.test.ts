import { describe, expect, it } from 'vitest';

import {
  distanceToEndMarker,
  easedScrollStep,
  findScrollContainer,
} from '../scroll-follow.utility';

describe('easedScrollStep', () => {
  it('moves a fraction of the distance and never overshoots', () => {
    const step = easedScrollStep(1000, 16, 110);
    expect(step).toBeGreaterThan(50);
    expect(step).toBeLessThan(200);
    expect(easedScrollStep(10, 1000, 110)).toBeLessThanOrEqual(10);
  });

  it('is frame-rate independent: two 8 ms frames cover about one 16 ms frame', () => {
    const one = easedScrollStep(1000, 16, 110);
    const half = easedScrollStep(1000, 8, 110);
    const second = easedScrollStep(1000 - half, 8, 110);
    expect(half + second).toBeCloseTo(one, 0);
  });

  it('moves at least one pixel while there is distance left, and snaps the last pixel', () => {
    expect(easedScrollStep(5, 1, 110)).toBe(1);
    expect(easedScrollStep(0.6, 16, 110)).toBe(0.6);
    expect(easedScrollStep(0, 16, 110)).toBe(0);
    expect(easedScrollStep(-3, 16, 110)).toBe(0);
  });
});

describe('findScrollContainer', () => {
  it('prefers <main>', () => {
    document.body.innerHTML = '<main><div><span id="x"></span></div></main>';
    expect(findScrollContainer(document.getElementById('x') as Element).tagName).toBe('MAIN');
  });

  it('uses the nearest overflowing scroller outside <main>', () => {
    document.body.innerHTML =
      '<div id="s" style="overflow-y:auto"><div><span id="x"></span></div></div>';
    const scroller = document.getElementById('s') as HTMLElement;
    Object.defineProperty(scroller, 'scrollHeight', { value: 900 });
    Object.defineProperty(scroller, 'clientHeight', { value: 300 });
    expect(findScrollContainer(document.getElementById('x') as Element)).toBe(scroller);
  });

  it('falls back to the document scroller', () => {
    document.body.innerHTML = '<div><span id="x"></span></div>';
    expect(findScrollContainer(document.getElementById('x') as Element)).toBe(
      document.scrollingElement ?? document.documentElement,
    );
  });
});

describe('distanceToEndMarker', () => {
  function container(scrollTop: number): HTMLElement {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', { value: 2000 });
    Object.defineProperty(element, 'clientHeight', { value: 800 });
    element.scrollTop = scrollTop;
    element.getBoundingClientRect = () => ({ bottom: 800 }) as DOMRect;
    return element;
  }
  function marker(bottom: number): HTMLElement {
    const element = document.createElement('div');
    element.getBoundingClientRect = () => ({ bottom }) as DOMRect;
    return element;
  }

  it('is the gap between the marker and the container bottom', () => {
    expect(distanceToEndMarker(container(0), marker(1500))).toBe(700);
  });

  it('never goes negative and never past the true bottom', () => {
    expect(distanceToEndMarker(container(0), marker(500))).toBe(0);
    expect(distanceToEndMarker(container(1000), marker(5000))).toBe(200);
  });
});
