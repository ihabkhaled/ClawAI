import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThreadFollowBottom } from '../use-thread-follow-bottom';

type Geometry = { scrollHeight: number; clientHeight: number };

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let now: number;
let resizeCallbacks: (() => void)[];
let observed: Element[];

/** Runs the queued animation frames once, 16 ms apart. */
function runFrame(): void {
  const queued = [...frames.entries()];
  frames.clear();
  now += 16;
  for (const [, callback] of queued) {
    callback(now);
  }
}

function runFrames(count: number): void {
  for (let i = 0; i < count; i += 1) {
    runFrame();
  }
}

function Probe({ signature, isRunning }: { signature: string; isRunning: boolean }) {
  const endRef = useThreadFollowBottom(signature, isRunning);
  return (
    <main data-testid="main" style={{ overflowY: 'auto' }}>
      <div data-testid="panel">
        <div ref={endRef} data-testid="end" />
      </div>
    </main>
  );
}

function setGeometry(element: HTMLElement, geometry: Geometry, scrollTop = 0): void {
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: geometry.scrollHeight,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: geometry.clientHeight,
  });
  element.scrollTop = scrollTop;
}

function mount(isRunning = true, geometry: Geometry = { scrollHeight: 2000, clientHeight: 800 }) {
  const view = render(<Probe signature="a" isRunning={isRunning} />);
  const main = view.getByTestId('main');
  setGeometry(main, geometry);
  // The end marker sits at the very end of the content; the scroller shows `clientHeight` of it.
  const end = view.getByTestId('end');
  end.getBoundingClientRect = () =>
    ({ bottom: main.scrollHeight - main.scrollTop }) as unknown as DOMRect;
  main.getBoundingClientRect = () => ({ bottom: main.clientHeight }) as unknown as DOMRect;
  return { view, main };
}

describe('useThreadFollowBottom', () => {
  beforeEach(() => {
    frames = new Map();
    nextFrame = 1;
    now = 0;
    resizeCallbacks = [];
    observed = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resizeCallbacks.push(callback);
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect() {}
        unobserve() {}
      },
    );
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('eases toward the bottom of <main> over several frames and then goes idle', () => {
    const { main } = mount();
    runFrame();
    const first = main.scrollTop;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1200);
    runFrame();
    expect(main.scrollTop).toBeGreaterThan(first);
    runFrames(200);
    expect(main.scrollTop).toBe(1200);
    expect(frames.size).toBe(0);
  });

  it('never moves backwards while it eases', () => {
    const { main } = mount();
    let previous = 0;
    for (let i = 0; i < 60; i += 1) {
      runFrame();
      expect(main.scrollTop).toBeGreaterThanOrEqual(previous);
      previous = main.scrollTop;
    }
  });

  it('keeps following when the content grows inside the same step (ResizeObserver)', () => {
    const { main } = mount();
    runFrames(200);
    expect(main.scrollTop).toBe(1200);
    expect(frames.size).toBe(0);

    setGeometry(main, { scrollHeight: 2600, clientHeight: 800 }, main.scrollTop);
    act(() => {
      for (const callback of resizeCallbacks) {
        callback();
      }
    });
    expect(frames.size).toBe(1);
    runFrames(200);
    expect(main.scrollTop).toBe(1800);
  });

  it('watches the panel, the scroller and its content', () => {
    const { view, main } = mount();
    expect(observed).toContain(view.getByTestId('panel'));
    expect(observed).toContain(main);
  });

  it('coalesces many updates in one frame into one frame request', () => {
    mount();
    act(() => {
      for (const callback of resizeCallbacks) {
        callback();
      }
      for (const callback of resizeCallbacks) {
        callback();
      }
      for (const callback of resizeCallbacks) {
        callback();
      }
    });
    expect(frames.size).toBe(1);
  });

  it('wakes on a new signature', () => {
    const { view, main } = mount();
    runFrames(200);
    setGeometry(main, { scrollHeight: 3000, clientHeight: 800 }, main.scrollTop);
    view.rerender(<Probe signature="b" isRunning />);
    expect(frames.size).toBe(1);
    runFrames(200);
    expect(main.scrollTop).toBe(2200);
  });

  it('does not scroll once the job has settled', () => {
    const { view, main } = mount(false);
    view.rerender(<Probe signature="b" isRunning={false} />);
    runFrames(10);
    expect(main.scrollTop).toBe(0);
    expect(frames.size).toBe(0);
  });

  it('finishes at the last update when the job settles mid-ease, then stays put', () => {
    const { view, main } = mount();
    runFrame();
    expect(main.scrollTop).toBeLessThan(1200);
    view.rerender(<Probe signature="b" isRunning={false} />);
    expect(frames.size).toBe(0);
    expect(main.scrollTop).toBe(1200);
    setGeometry(main, { scrollHeight: 3000, clientHeight: 800 }, main.scrollTop);
    runFrames(10);
    expect(main.scrollTop).toBe(1200);
  });

  it('targets the end marker, not content that appears below it', () => {
    const { view, main } = mount();
    const end = view.getByTestId('end');
    // 400 px of verdict panel below the marker.
    end.getBoundingClientRect = () =>
      ({ bottom: main.scrollHeight - 400 - main.scrollTop }) as unknown as DOMRect;
    runFrames(300);
    expect(main.scrollTop).toBe(800);
  });

  it('jumps instantly when the reader prefers reduced motion', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const { main } = mount();
    runFrame();
    expect(main.scrollTop).toBe(1200);
  });

  it('stops following when the reader scrolls up, and resumes at the bottom', () => {
    const { main } = mount();
    runFrames(200);
    fireEvent.wheel(window, { deltaY: -120 });
    setGeometry(main, { scrollHeight: 2600, clientHeight: 800 }, 900);
    act(() => {
      for (const callback of resizeCallbacks) {
        callback();
      }
    });
    runFrames(20);
    expect(main.scrollTop).toBe(900);

    // Back within 24 px of the bottom of the scroller that scrolled.
    main.scrollTop = 1790;
    fireEvent.scroll(main);
    expect(frames.size).toBe(1);
    runFrames(200);
    expect(main.scrollTop).toBe(1800);
  });

  it('does not resume on a small scroll up that is still well above the bottom', () => {
    const { main } = mount();
    runFrames(200);
    fireEvent.wheel(window, { deltaY: -100 });
    setGeometry(main, { scrollHeight: 2600, clientHeight: 800 }, 1100);
    fireEvent.scroll(main);
    act(() => {
      for (const callback of resizeCallbacks) {
        callback();
      }
    });
    runFrames(20);
    expect(main.scrollTop).toBe(1100);
  });

  it.each(['PageUp', 'ArrowUp', 'Home'])('stops following on %s', (key) => {
    const { main } = mount();
    runFrames(200);
    fireEvent.keyDown(window, { key });
    setGeometry(main, { scrollHeight: 2600, clientHeight: 800 }, 700);
    act(() => {
      for (const callback of resizeCallbacks) {
        callback();
      }
    });
    runFrames(20);
    expect(main.scrollTop).toBe(700);
  });

  it('stops following on a touch drag', () => {
    const { main } = mount();
    runFrames(200);
    fireEvent.touchMove(window);
    setGeometry(main, { scrollHeight: 2600, clientHeight: 800 }, 700);
    act(() => {
      for (const callback of resizeCallbacks) {
        callback();
      }
    });
    runFrames(20);
    expect(main.scrollTop).toBe(700);
  });

  it('keeps following on a downward wheel', () => {
    const { main } = mount();
    runFrames(200);
    fireEvent.wheel(window, { deltaY: 120 });
    setGeometry(main, { scrollHeight: 2600, clientHeight: 800 }, main.scrollTop);
    act(() => {
      for (const callback of resizeCallbacks) {
        callback();
      }
    });
    runFrames(200);
    expect(main.scrollTop).toBe(1800);
  });

  it('leaves no frame behind on unmount', () => {
    const { view } = mount();
    view.unmount();
    expect(frames.size).toBe(0);
  });
});
