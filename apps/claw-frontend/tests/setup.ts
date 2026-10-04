import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not ship ResizeObserver. Hooks like use-rich-prompt-textarea
// (which latches manual textarea resize via ResizeObserver) instantiate one
// on mount; without this polyfill every test that mounts such a hook throws
// `ResizeObserver is not defined` in a passive-effect handler.
class ResizeObserverPolyfill {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

// jsdom does not implement scrollIntoView. cmdk (the ModelPicker search
// combobox's Command primitive) calls it on every item whenever the
// highlighted/selected item changes; without this polyfill any test that
// opens a ModelPicker throws `scrollIntoView is not a function`.
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = (): void => {};
}

// jsdom does not implement pointer capture. Radix's Select opens/dismisses
// via setPointerCapture/hasPointerCapture/releasePointerCapture on the
// triggered element; without these polyfills any test that opens a Radix
// Select through a real userEvent.click throws
// `target.hasPointerCapture is not a function`.
if (typeof Element.prototype.hasPointerCapture === 'undefined') {
  Element.prototype.hasPointerCapture = (): boolean => false;
}
if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Element.prototype.setPointerCapture = (): void => {};
}
if (typeof Element.prototype.releasePointerCapture === 'undefined') {
  Element.prototype.releasePointerCapture = (): void => {};
}

// jsdom has no layout, so the real Virtuoso measures a 0px viewport and renders
// nothing. Default to a stand-in that renders EVERY item through itemContent,
// which is what the picker and list tests assert against. A test that needs the
// real wiring (virtualized-messages) mocks '@/lib/virtuoso' itself.
vi.mock('@/lib/virtuoso', async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import('react');
  type MockProps = {
    data?: readonly unknown[];
    itemContent?: (index: number, item: unknown) => unknown;
    computeItemKey?: (index: number, item: unknown) => string;
  };
  const Virtuoso = forwardRef<unknown, MockProps>((props, ref) => {
    useImperativeHandle(ref, () => ({
      scrollIntoView: () => undefined,
      scrollToIndex: () => undefined,
    }));
    return createElement(
      'div',
      { 'data-testid': 'virtuoso-mock' },
      (props.data ?? []).map((item, index) =>
        createElement(
          'div',
          { key: props.computeItemKey ? props.computeItemKey(index, item) : index },
          props.itemContent?.(index, item) as never,
        ),
      ),
    );
  });
  return { Virtuoso };
});
