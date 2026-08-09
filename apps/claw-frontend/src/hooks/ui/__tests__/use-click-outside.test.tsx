import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useClickOutside } from '@/hooks/ui/use-click-outside';

function Harness({
  onOutside,
  enabled = true,
}: {
  onOutside: () => void;
  enabled?: boolean;
}): React.ReactElement {
  const ref = React.useRef<HTMLDivElement>(null);
  useClickOutside(ref, onOutside, enabled);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        <button data-testid="inside-child">child</button>
      </div>
      <div data-testid="outside">outside</div>
    </div>
  );
}

function pointerDown(element: Element): void {
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
}

describe('useClickOutside', () => {
  it('fires when the press lands outside the ref', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} />);

    pointerDown(getByTestId('outside'));

    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not fire for a press inside the ref', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} />);

    pointerDown(getByTestId('inside'));

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('does not fire for a press on a descendant of the ref', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} />);

    pointerDown(getByTestId('inside-child'));

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('does not listen while disabled', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} enabled={false} />);

    pointerDown(getByTestId('outside'));

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('detaches its listener on unmount', () => {
    const onOutside = vi.fn();
    const { getByTestId, unmount } = render(<Harness onOutside={onOutside} />);
    const outside = getByTestId('outside');

    unmount();
    pointerDown(outside);

    expect(onOutside).not.toHaveBeenCalled();
  });
});
