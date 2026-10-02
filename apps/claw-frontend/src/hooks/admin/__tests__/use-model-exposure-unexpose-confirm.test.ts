import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ConnectorModelRow } from '@/types/model-exposure.types';

import { useModelExposureUnexposeConfirm } from '../use-model-exposure-unexpose-confirm';

const row = { modelKey: 'openai/gpt-x' } as ConnectorModelRow;

describe('useModelExposureUnexposeConfirm', () => {
  it('unexposes only after the operator confirms', () => {
    const applyTo = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useModelExposureUnexposeConfirm(applyTo));

    act(() => result.current.request(row));
    expect(result.current.pending).toBe(row);
    expect(applyTo).not.toHaveBeenCalled();

    act(() => result.current.confirm());

    expect(applyTo).toHaveBeenCalledWith(['openai/gpt-x'], false);
    expect(result.current.pending).toBeNull();
  });

  it('cancels without applying', () => {
    const applyTo = vi.fn();
    const { result } = renderHook(() => useModelExposureUnexposeConfirm(applyTo));

    act(() => result.current.request(row));
    act(() => result.current.onOpenChange(false));

    expect(result.current.pending).toBeNull();
    expect(applyTo).not.toHaveBeenCalled();
  });
});
