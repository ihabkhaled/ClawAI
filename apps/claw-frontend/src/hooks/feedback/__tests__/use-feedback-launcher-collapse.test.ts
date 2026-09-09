import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY } from '@/constants/feedback.constants';
import { useFeedbackLauncherCollapse } from '@/hooks/feedback/use-feedback-launcher-collapse';

describe('useFeedbackLauncherCollapse', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts expanded when nothing has been persisted', () => {
    const { result } = renderHook(() => useFeedbackLauncherCollapse());
    expect(result.current.isCollapsed).toBe(false);
  });

  it('reads a previously persisted collapsed state on mount', async () => {
    window.localStorage.setItem(FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useFeedbackLauncherCollapse());
    await act(async () => {});
    expect(result.current.isCollapsed).toBe(true);
  });

  it('collapse() tucks the launcher away and persists the choice', () => {
    const { result } = renderHook(() => useFeedbackLauncherCollapse());

    act(() => {
      result.current.collapse();
    });

    expect(result.current.isCollapsed).toBe(true);
    expect(window.localStorage.getItem(FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY)).toBe('true');
  });

  it('expand() restores the launcher and persists the choice', () => {
    const { result } = renderHook(() => useFeedbackLauncherCollapse());

    act(() => {
      result.current.collapse();
    });
    act(() => {
      result.current.expand();
    });

    expect(result.current.isCollapsed).toBe(false);
    expect(window.localStorage.getItem(FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY)).toBe('false');
  });

  it('expands once a pointer drag on the edge tab exceeds the threshold', () => {
    const { result } = renderHook(() => useFeedbackLauncherCollapse());

    act(() => {
      result.current.collapse();
    });
    expect(result.current.isCollapsed).toBe(true);

    act(() => {
      result.current.onEdgeTabPointerDown({
        clientX: 100,
        clientY: 100,
      } as React.PointerEvent<HTMLButtonElement>);
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 40, clientY: 100 }));
    });

    expect(result.current.isCollapsed).toBe(false);
  });

  it('does not expand from a small pointer movement below the threshold', () => {
    const { result } = renderHook(() => useFeedbackLauncherCollapse());

    act(() => {
      result.current.collapse();
    });

    act(() => {
      result.current.onEdgeTabPointerDown({
        clientX: 100,
        clientY: 100,
      } as React.PointerEvent<HTMLButtonElement>);
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 95, clientY: 100 }));
    });

    expect(result.current.isCollapsed).toBe(true);
  });
});
