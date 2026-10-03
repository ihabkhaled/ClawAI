import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useScrollUpIntent } from '@/hooks/chat/use-scroll-up-intent';

function makeScroller(): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
  return el;
}

function scrollTo(el: HTMLElement, top: number): void {
  el.scrollTop = top;
  el.dispatchEvent(new Event('scroll'));
}

describe('useScrollUpIntent', () => {
  it('starts pinned', () => {
    const { result } = renderHook(() => useScrollUpIntent());
    expect(result.current.pinnedRef.current).toBe(true);
  });

  it('unpins when scrollTop decreases and re-pins at the bottom', () => {
    const { result } = renderHook(() => useScrollUpIntent());
    const el = makeScroller();
    result.current.scrollerRef(el);
    scrollTo(el, 600);
    expect(result.current.pinnedRef.current).toBe(true);
    scrollTo(el, 300);
    expect(result.current.pinnedRef.current).toBe(false);
    scrollTo(el, 400);
    expect(result.current.pinnedRef.current).toBe(false);
    scrollTo(el, 600);
    expect(result.current.pinnedRef.current).toBe(true);
  });

  it('content growth alone never unpins (scrollTop unchanged)', () => {
    const { result } = renderHook(() => useScrollUpIntent());
    const el = makeScroller();
    result.current.scrollerRef(el);
    scrollTo(el, 600);
    Object.defineProperty(el, 'scrollHeight', { value: 2000, configurable: true });
    el.dispatchEvent(new Event('scroll'));
    expect(result.current.pinnedRef.current).toBe(true);
  });

  it('pin() re-pins and detaching stops listening', () => {
    const { result } = renderHook(() => useScrollUpIntent());
    const el = makeScroller();
    result.current.scrollerRef(el);
    scrollTo(el, 600);
    scrollTo(el, 100);
    expect(result.current.pinnedRef.current).toBe(false);
    result.current.pin();
    expect(result.current.pinnedRef.current).toBe(true);
    result.current.scrollerRef(null);
    scrollTo(el, 0);
    expect(result.current.pinnedRef.current).toBe(true);
  });
});
