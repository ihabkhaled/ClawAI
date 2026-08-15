import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSmartRouterPublishConfirm } from '@/hooks/admin/use-smart-router-publish-confirm';

describe('useSmartRouterPublishConfirm', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useSmartRouterPublishConfirm());
    expect(result.current.isOpen).toBe(false);
  });

  it('open sets isOpen true, close sets it back to false', () => {
    const { result } = renderHook(() => useSmartRouterPublishConfirm());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });
});
