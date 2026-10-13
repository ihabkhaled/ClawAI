import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useThreadStepExcerpt } from '../use-thread-step-excerpt';

describe('useThreadStepExcerpt', () => {
  it('starts closed and toggles', () => {
    const { result } = renderHook(() => useThreadStepExcerpt());
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });
});
