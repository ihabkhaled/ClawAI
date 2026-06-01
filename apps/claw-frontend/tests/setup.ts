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
