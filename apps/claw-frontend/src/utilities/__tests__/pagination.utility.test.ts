import { describe, expect, it } from 'vitest';

import { buildPageWindow, clampPage, pageRange } from '../pagination.utility';

describe('buildPageWindow', () => {
  it('shows every page while they all fit', () => {
    expect(buildPageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps first, last and the neighbours of the current page', () => {
    expect(buildPageWindow(7, 40)).toEqual([1, 'ellipsis', 6, 7, 8, 'ellipsis', 40]);
  });

  it('does not hide a single page behind a marker of the same width', () => {
    // 1 … 3 4 5 6 7 8 would be dishonest and no narrower than showing page 2.
    expect(buildPageWindow(4, 8)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 8]);
  });

  it('has no leading gap near the start, or trailing gap near the end', () => {
    expect(buildPageWindow(2, 40)).toEqual([1, 2, 3, 'ellipsis', 40]);
    expect(buildPageWindow(39, 40)).toEqual([1, 'ellipsis', 38, 39, 40]);
  });

  it('never repeats a page, whatever the position', () => {
    for (let page = 1; page <= 40; page += 1) {
      const numbers = buildPageWindow(page, 40).filter((i): i is number => i !== 'ellipsis');
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('keeps a constant width so a phone layout cannot be pushed sideways', () => {
    // The whole point: the strip does not grow with the total.
    expect(buildPageWindow(500, 1000)).toHaveLength(buildPageWindow(50, 100).length);
  });

  it('survives a total of zero or one', () => {
    expect(buildPageWindow(1, 0)).toEqual([1]);
    expect(buildPageWindow(1, 1)).toEqual([1]);
  });

  it('clamps a current page that is out of range instead of inventing one', () => {
    expect(buildPageWindow(999, 40)).toEqual([1, 'ellipsis', 39, 40]);
    expect(buildPageWindow(-3, 40)).toEqual([1, 2, 'ellipsis', 40]);
  });

  it('renders a short list in full rather than hiding pages for nothing', () => {
    // Caught by this suite: 1 of 5 used to render `1 2 … 5`, which is the same
    // width as `1 2 3 4 5` and hides two reachable pages.
    expect(buildPageWindow(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(buildPageWindow(1, 8)).toEqual([1, 2, 'ellipsis', 8]);
  });
});

describe('clampPage', () => {
  it.each([
    [0, 10, 1],
    [-4, 10, 1],
    [11, 10, 10],
    [5, 10, 5],
    [3.7, 10, 3],
  ])('clampPage(%s, %s) is %s', (page, total, expected) => {
    expect(clampPage(page, total)).toBe(expected);
  });

  it('lands on page 1 for a value the jump box can produce', () => {
    // An emptied number input reads as NaN.
    expect(clampPage(Number.NaN, 10)).toBe(1);
  });
});

describe('pageRange', () => {
  it('reports the rows this page is showing', () => {
    expect(pageRange(3, 20, 213)).toEqual({ from: 41, to: 60 });
  });

  it('stops at the total on a short last page', () => {
    expect(pageRange(11, 20, 213)).toEqual({ from: 201, to: 213 });
  });

  it('is null when there is nothing to show, so no "1-0 of 0" is rendered', () => {
    expect(pageRange(1, 20, 0)).toBeNull();
  });

  it('is null past the end rather than a negative or inverted range', () => {
    expect(pageRange(9, 20, 30)).toBeNull();
  });
});
