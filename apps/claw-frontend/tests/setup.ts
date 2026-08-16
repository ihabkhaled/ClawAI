import '@testing-library/jest-dom/vitest';

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
