import { describe, expect, it } from 'vitest';

import { safeReturnRoute } from '@/utilities/safe-return-route.utility';

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
