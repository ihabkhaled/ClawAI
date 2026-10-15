import { describe, expect, it } from 'vitest';

import {
  buildReturnTo,
  resolveLoginReturn,
  safeReturnRoute,
} from '@/utilities/safe-return-route.utility';

describe('safeReturnRoute', () => {
  it('preserves the local VS Code approval path after login', () => {
    expect(safeReturnRoute('/authorize/vscode?requestId=request-1')).toBe(
      '/authorize/vscode?requestId=request-1',
    );
  });

  it.each([null, 'https://evil.example', '//evil.example', '/\\evil.example', ' /billing'])(
    'falls back to chat for unsafe return route %s',
    (value) => {
      expect(safeReturnRoute(value)).toBe('/chat');
    },
  );
});

describe('return address fragments', () => {
  const review = '/threads/review/pub-1';

  it('carries the deep-link fragment exactly once', () => {
    expect(buildReturnTo(review, '', '#change-request-X')).toBe(`${review}#change-request-X`);
    expect(buildReturnTo(review, 'a=1', '#change-request-X#change-request-X')).toBe(
      `${review}?a=1#change-request-X`,
    );
    expect(buildReturnTo(review, '', '')).toBe(review);
    expect(buildReturnTo(review, '', '#')).toBe(review);
  });

  it('collapses a doubled fragment in a stored returnTo', () => {
    expect(safeReturnRoute(`${review}#change-request-X#change-request-X`)).toBe(
      `${review}#change-request-X`,
    );
  });

  it('restores the page fragment the browser kept when returnTo lost it', () => {
    expect(resolveLoginReturn(review, '#change-request-X')).toBe(`${review}#change-request-X`);
    expect(resolveLoginReturn(`${review}#change-request-X`, '#change-request-X')).toBe(
      `${review}#change-request-X`,
    );
    expect(resolveLoginReturn(null, '#change-request-X')).toBe('/chat');
    expect(resolveLoginReturn(review, '')).toBe(review);
  });
});
