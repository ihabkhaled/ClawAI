import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThreadFollowBottom } from '../use-thread-follow-bottom';

const scrollIntoView = vi.fn();

function Probe({ signature, isRunning }: { signature: string; isRunning: boolean }) {
  const endRef = useThreadFollowBottom(signature, isRunning);
  return <div ref={endRef} data-testid="end" />;
}

describe('useThreadFollowBottom', () => {
  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });
  afterEach(() => vi.restoreAllMocks());

  it('scrolls to the end on load and on every new update while the job runs', () => {
    const view = render(<Probe signature="a" isRunning />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    view.rerender(<Probe signature="b" isRunning />);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'end', behavior: 'smooth' });
  });

  it('does not scroll once the job has settled', () => {
    const view = render(<Probe signature="a" isRunning={false} />);
    view.rerender(<Probe signature="b" isRunning={false} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('uses an instant scroll when the reader prefers reduced motion', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<Probe signature="a" isRunning />);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'end', behavior: 'auto' });
  });

  it('stops following when the reader scrolls up, and resumes at the bottom', () => {
    const view = render(<Probe signature="a" isRunning />);
    scrollIntoView.mockClear();
    fireEvent.wheel(window, { deltaY: -120 });
    view.rerender(<Probe signature="b" isRunning />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    // Back at the bottom of the scroller that scrolled.
    const scroller = document.createElement('div');
    document.body.append(scroller);
    Object.defineProperties(scroller, {
      scrollHeight: { value: 2000 },
      scrollTop: { value: 1190 },
      clientHeight: { value: 800 },
    });
    fireEvent.scroll(scroller);
    view.rerender(<Probe signature="c" isRunning />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not resume on a small scroll up that is still well above the bottom', () => {
    const view = render(<Probe signature="a" isRunning />);
    scrollIntoView.mockClear();
    fireEvent.wheel(window, { deltaY: -100 });
    const scroller = document.createElement('div');
    document.body.append(scroller);
    Object.defineProperties(scroller, {
      scrollHeight: { value: 2000 },
      scrollTop: { value: 1100 },
      clientHeight: { value: 800 },
    });
    fireEvent.scroll(scroller);
    view.rerender(<Probe signature="b" isRunning />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('stops following on PageUp and on a touch drag', () => {
    const view = render(<Probe signature="a" isRunning />);
    scrollIntoView.mockClear();
    fireEvent.keyDown(window, { key: 'PageUp' });
    view.rerender(<Probe signature="b" isRunning />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
