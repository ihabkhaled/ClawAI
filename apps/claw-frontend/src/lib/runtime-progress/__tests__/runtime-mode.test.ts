import { describe, expect, it } from 'vitest';

import { isLocalAiRuntimeEnabled } from '@/lib/runtime-progress/runtime-mode';

describe('isLocalAiRuntimeEnabled', () => {
  it.each([
    ['true', true],
    ['TRUE', true],
    [' false ', false],
    [undefined, false],
  ])('maps %s to %s', (value, expected) => {
    expect(isLocalAiRuntimeEnabled(value)).toBe(expected);
  });
});
