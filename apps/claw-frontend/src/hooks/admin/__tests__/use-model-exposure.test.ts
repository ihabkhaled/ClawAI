import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MODEL_EXPOSURE_BATCH_SIZE } from '@/constants';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type { ConnectorModelRow } from '@/types/model-exposure.types';

const fetchConnectorModels = vi.fn();
const setModelExposure = vi.fn();

vi.mock('@/services/admin/model-exposure.service', () => ({
  fetchConnectorModels: (...args: unknown[]) => fetchConnectorModels(...args),
  setModelExposure: (...args: unknown[]) => setModelExposure(...args),
  filterModels: (rows: ConnectorModelRow[]) => rows,
}));

const { useModelExposure } = await import('../use-model-exposure');

const rowsOf = (count: number): ConnectorModelRow[] =>
  Array.from({ length: count }, (_, i) => ({
    modelKey: `openrouter/model-${String(i)}`,
    displayName: `Model ${String(i)}`,
    provider: 'OPENROUTER',
    exposure: ConnectorModelExposure.UNEXPOSED,
    kind: 'CHAT',
    lifecycle: 'ACTIVE',
  })) as unknown as ConnectorModelRow[];

describe('useModelExposure — bulk apply', () => {
  beforeEach(() => {
    fetchConnectorModels.mockReset();
    setModelExposure.mockReset();
  });

  // The exact bug reported live: 447 OpenRouter models selected via "Select
  // all shown" and "Expose selected" failed outright because the backend
  // caps one request at 200 model keys — the request was never chunked.
  it('splits a selection larger than the backend cap into sequential batches', async () => {
    const rows = rowsOf(447);
    fetchConnectorModels.mockResolvedValue(rows);
    setModelExposure.mockResolvedValue({});

    const { result } = renderHook(() => useModelExposure('connector-1'));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.selectAllVisible();
    });

    await act(async () => {
      await result.current.apply(true);
    });

    expect(setModelExposure).toHaveBeenCalledTimes(3);
    const sizes = setModelExposure.mock.calls.map((call) => {
      const [, req] = call as [string, { modelKeys: string[] }];
      return req.modelKeys.length;
    });
    expect(sizes).toEqual([200, 200, 47]);
    expect(result.current.errorMessage).toBeNull();
  });

  it('does not chunk a selection that already fits under the cap', async () => {
    const rows = rowsOf(5);
    fetchConnectorModels.mockResolvedValue(rows);
    setModelExposure.mockResolvedValue({});

    const { result } = renderHook(() => useModelExposure('connector-1'));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.selectAllVisible();
    });

    await act(async () => {
      await result.current.apply(true);
    });

    expect(setModelExposure).toHaveBeenCalledTimes(1);
    const [, req] = setModelExposure.mock.calls[0] as [string, { modelKeys: string[] }];
    expect(req.modelKeys).toHaveLength(5);
  });

  // The backend used to answer every rejected batch with a bare "Validation
  // failed" and no detail. Now that ZodValidationPipe groups issues by
  // field, the hook must build a readable sentence from them.
  it('surfaces the backend field-level validation detail instead of a generic message', async () => {
    const rows = rowsOf(MODEL_EXPOSURE_BATCH_SIZE);
    fetchConnectorModels.mockResolvedValue(rows);
    setModelExposure.mockRejectedValue(
      new ApiClientError({
        message: 'Validation failed',
        status: 400,
        errors: { modelKeys: ['Array must contain at most 200 element(s)'] },
      }),
    );

    const { result } = renderHook(() => useModelExposure('connector-1'));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.selectAllVisible();
    });

    await act(async () => {
      await result.current.apply(true);
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toContain('modelKeys');
      expect(result.current.errorMessage).toContain('at most 200');
    });
  });

  it('reports how many models applied before a later batch failed', async () => {
    const rows = rowsOf(MODEL_EXPOSURE_BATCH_SIZE + 10);
    fetchConnectorModels.mockResolvedValue(rows);
    setModelExposure
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new ApiClientError({ message: 'boom', status: 500 }));

    const { result } = renderHook(() => useModelExposure('connector-1'));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.selectAllVisible();
    });

    await act(async () => {
      await result.current.apply(true);
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toContain('Applied 200 model(s) before this failed');
    });
  });
});
