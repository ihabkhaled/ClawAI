import { act, render } from '@testing-library/react';
import { useImperativeHandle, useLayoutEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStickyBottomScroll } from '@/hooks/chat/use-sticky-bottom-scroll';
import type { UseStickyBottomScrollReturn } from '@/types';

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;
type ResizeCallback = () => void;

type HarnessControls = {
  scroller: HTMLDivElement;
  sentinel: HTMLDivElement;
  setScrollerDimensions: (opts: {
    scrollHeight: number;
    clientHeight: number;
    scrollTop: number;
  }) => void;
  emitScroll: () => void;
  emitIntersection: (isIntersecting: boolean) => void;
  emitResize: () => void;
  hook: UseStickyBottomScrollReturn;
};

// Captured by the stubbed observers so tests can drive them.
let intersectionCallback: IntersectionCallback | undefined;
let resizeCallback: ResizeCallback | undefined;
let scrollListener: ((event: Event) => void) | undefined;
let lastHook: UseStickyBottomScrollReturn | undefined;

function setDims(
  el: HTMLElement,
  opts: { scrollHeight: number; clientHeight: number; scrollTop: number },
): void {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: opts.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: opts.clientHeight });
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    writable: true,
    value: opts.scrollTop,
  });
}

type WrapperHandle = { hook: UseStickyBottomScrollReturn };

function Wrapper({
  signal,
  scrollerEl,
  sentinelEl,
  controlRef,
}: {
  signal: unknown;
  scrollerEl: HTMLDivElement;
  sentinelEl: HTMLDivElement;
  controlRef: React.RefObject<WrapperHandle | null>;
}): null {
  const hook = useStickyBottomScroll({ contentSignal: signal });
  // Wire refs synchronously BEFORE the hook's effect runs so the observers
  // attach to real DOM the first time.
  useLayoutEffect(() => {
    hook.scrollRef.current = scrollerEl;
    hook.sentinelRef.current = sentinelEl;
  }, [hook.scrollRef, hook.sentinelRef, scrollerEl, sentinelEl]);
  useImperativeHandle(controlRef, () => ({ hook }), [hook]);
  lastHook = hook;
  return null;
}

beforeEach(() => {
  intersectionCallback = undefined;
  resizeCallback = undefined;
  scrollListener = undefined;
  lastHook = undefined;

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionCallback) {
        intersectionCallback = cb;
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeCallback) {
        resizeCallback = cb;
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
});

function mountHookWithDOM(initialSignal: unknown): HarnessControls {
  const scroller = document.createElement('div');
  const sentinelParent = document.createElement('div');
  const sentinel = document.createElement('div');
  // jsdom doesn't implement scrollIntoView; install a default noop so the
  // hook's initial sticky-bottom rAF doesn't blow up before each test gets
  // a chance to install its own spy.
  sentinel.scrollIntoView = (): void => undefined;
  // jsdom also doesn't implement scrollTo on Element.
  scroller.scrollTo = ((): void => undefined) as unknown as HTMLElement['scrollTo'];
  sentinelParent.append(sentinel);
  scroller.append(sentinelParent);
  document.body.append(scroller);

  // Capture the scroll listener Virtuoso/our hook adds, so tests can fire it.
  const originalAdd = scroller.addEventListener.bind(scroller);
  scroller.addEventListener = ((event: string, listener: EventListener): void => {
    if (event === 'scroll') {
      scrollListener = listener as (event: Event) => void;
    }
    originalAdd(event, listener);
  }) as typeof scroller.addEventListener;

  setDims(scroller, { scrollHeight: 1000, clientHeight: 500, scrollTop: 500 });

  const handleRef = { current: null as WrapperHandle | null };
  render(
    <Wrapper
      signal={initialSignal}
      scrollerEl={scroller}
      sentinelEl={sentinel}
      controlRef={handleRef}
    />,
  );

  return {
    scroller,
    sentinel,
    setScrollerDimensions: (opts): void => setDims(scroller, opts),
    emitScroll: (): void => scrollListener?.(new Event('scroll')),
    emitIntersection: (isIntersecting: boolean): void => {
      intersectionCallback?.([{ isIntersecting } as IntersectionObserverEntry]);
    },
    emitResize: (): void => resizeCallback?.(),
    get hook(): UseStickyBottomScrollReturn {
      const h = handleRef.current?.hook ?? lastHook;
      if (!h) {
        throw new Error('Wrapper handle not initialised');
      }
      return h;
    },
  };
}

describe('useStickyBottomScroll', () => {
  it('scrolls to bottom on contentSignal change when the user is at the bottom', () => {
    const scrollIntoViewSpy = vi.fn();
    const harness = mountHookWithDOM('a');
    harness.sentinel.scrollIntoView = scrollIntoViewSpy;
    // mountHookWithDOM defaulted to 1000/500/500 → distance=0, already at bottom

    // Confirm via intersection signal too.
    act(() => {
      harness.emitIntersection(true);
    });
    expect(harness.hook.isAtBottom).toBe(true);

    // Drive a content change → hook should call scrollIntoView
    act(() => {
      harness.hook.scrollToBottom('auto');
    });
    expect(scrollIntoViewSpy).toHaveBeenCalled();
  });

  it('does NOT scroll on contentSignal change when the user has scrolled up', () => {
    const harness = mountHookWithDOM('a');
    const scrollIntoViewSpy = vi.fn();
    harness.sentinel.scrollIntoView = scrollIntoViewSpy;

    // Move the user up
    harness.setScrollerDimensions({ scrollHeight: 1000, clientHeight: 500, scrollTop: 100 });
    act(() => {
      harness.emitScroll();
    });
    expect(harness.hook.isAtBottom).toBe(false);

    // Trigger the resize observer (mimics streaming token batch): hook should
    // re-check bottom state and NOT scroll, because user is scrolled up.
    const callsBefore = scrollIntoViewSpy.mock.calls.length;
    act(() => {
      harness.emitResize();
    });
    expect(scrollIntoViewSpy.mock.calls.length).toBe(callsBefore);
  });

  it('flips isAtBottom to false when the user scrolls beyond the threshold', () => {
    const harness = mountHookWithDOM(0);

    harness.setScrollerDimensions({ scrollHeight: 1000, clientHeight: 500, scrollTop: 100 });
    act(() => {
      harness.emitScroll();
    });
    expect(harness.hook.isAtBottom).toBe(false);
  });

  it('flips isAtBottom back to true when the user scrolls back within the threshold', () => {
    const harness = mountHookWithDOM(0);

    harness.setScrollerDimensions({ scrollHeight: 1000, clientHeight: 500, scrollTop: 100 });
    act(() => {
      harness.emitScroll();
    });
    expect(harness.hook.isAtBottom).toBe(false);

    harness.setScrollerDimensions({ scrollHeight: 1000, clientHeight: 500, scrollTop: 450 });
    act(() => {
      harness.emitScroll();
    });
    expect(harness.hook.isAtBottom).toBe(true);
  });

  it('scrollToBottom pins to the sentinel and forces isAtBottom=true', () => {
    const harness = mountHookWithDOM(0);
    const scrollIntoViewSpy = vi.fn();
    harness.sentinel.scrollIntoView = scrollIntoViewSpy;

    // User scrolled up first
    harness.setScrollerDimensions({ scrollHeight: 1000, clientHeight: 500, scrollTop: 100 });
    act(() => {
      harness.emitScroll();
    });
    expect(harness.hook.isAtBottom).toBe(false);

    act(() => {
      harness.hook.scrollToBottom('smooth');
    });
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'end', behavior: 'smooth' });
    expect(harness.hook.isAtBottom).toBe(true);
  });
});
