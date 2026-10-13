import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInView } from '@/hooks/common/use-in-view';

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;
const created: { callback: ObserverCallback; options: IntersectionObserverInit | undefined }[] = [];
const disconnect = vi.fn();

class FakeIntersectionObserver {
  readonly observe = vi.fn();
  readonly disconnect = disconnect;
  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    created.push({ callback, options });
  }
}

function Probe(): React.ReactElement {
  const { inViewRef, isInView } = useInView('50px');
  return (
    <div ref={inViewRef} data-testid="probe">
      {String(isInView)}
    </div>
  );
}

describe('useInView', () => {
  beforeEach(() => {
    created.length = 0;
    disconnect.mockClear();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts out of view and watches with the given margin', () => {
    render(<Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('false');
    expect(created[0]?.options).toEqual({ rootMargin: '50px' });
  });

  it('flips to in view when the element intersects, then stops observing', () => {
    render(<Probe />);

    act(() => created[0]?.callback([{ isIntersecting: false }]));
    expect(screen.getByTestId('probe')).toHaveTextContent('false');

    act(() => created[0]?.callback([{ isIntersecting: true }]));
    expect(screen.getByTestId('probe')).toHaveTextContent('true');
    expect(disconnect).toHaveBeenCalled();
  });

  it('counts as in view where IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('true');
  });
});
