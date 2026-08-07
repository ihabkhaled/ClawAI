import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanModelAccessMode } from '@/enums';
import { useModelAccessPage } from '@/hooks/plans/use-model-access-page';
import type { PlanView } from '@/types';

const mockGet = vi.fn();
const mockUpdateModelAccess = vi.fn();

// Reproduces the production failure. When claw-ollama-service and
// claw-llamacpp-service are not deployed, their endpoints answer 502 forever,
// the underlying queries never hold data, and `data ?? []` handed every render
// a brand new array. useAvailableModels' useMemo therefore recomputed every
// render and useModelAccessPage saw a new `groupedModels` identity every time.
//
// This mock recreates that exactly: a fresh array on every single call. Against
// the previous implementation the seeding effect re-ran on each render, called
// setRows with newly generated rowKeys, and React aborted the tree with
// "Maximum update depth exceeded" (minified error #185).
vi.mock('@/hooks/chat/use-available-models', () => ({
  useAvailableModels: (): { groupedModels: unknown[]; isLoading: boolean } => ({
    groupedModels: [
      {
        provider: 'OPENAI',
        label: 'OpenAI',
        models: [
          { provider: 'OPENAI', model: 'gpt-4o', displayName: 'GPT-4o' },
          { provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' },
        ],
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/repositories/admin/plans.repository', () => ({
  plansRepository: {
    get: (...args: unknown[]) => mockGet(...args),
    updateModelAccess: (...args: unknown[]) => mockUpdateModelAccess(...args),
  },
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'u1', role: 'ADMIN' }, isLoading: false, isError: false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: 'pl1' }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    showToast: {
      success: vi.fn(),
      apiError: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const allowAllPlan = {
  id: 'pl1',
  updatedAt: '2026-08-01T00:00:00.000Z',
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  modelAccess: [],
} as unknown as PlanView;

describe('useModelAccessPage — stability when local model services are unavailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds once and converges even though the catalogue identity churns every render', async () => {
    mockGet.mockResolvedValue(allowAllPlan);
    const { result, rerender } = renderHook(() => useModelAccessPage(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });

    const seeded = result.current.rows;
    rerender();
    rerender();
    rerender();

    // Same array instance: the effect did not re-seed. Before the fix each
    // render produced a new array with new rowKeys, which is what made the
    // loop unbounded.
    expect(result.current.rows).toBe(seeded);
  });

  it('keeps rowKeys stable across re-renders so React can reconcile the list', async () => {
    mockGet.mockResolvedValue(allowAllPlan);
    const { result, rerender } = renderHook(() => useModelAccessPage(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });
    const keysBefore = result.current.rows.map((row) => row.rowKey);

    rerender();

    expect(result.current.rows.map((row) => row.rowKey)).toEqual(keysBefore);
  });

  it('does not discard administrator edits when the catalogue re-renders', async () => {
    mockGet.mockResolvedValue(allowAllPlan);
    const { result, rerender } = renderHook(() => useModelAccessPage(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });

    const targetKey = result.current.rows[0]?.rowKey ?? '';
    act(() => {
      result.current.updateRow(targetKey, 'isAllowed', false);
    });
    act(() => {
      result.current.addRow();
    });

    rerender();
    rerender();

    expect(result.current.rows).toHaveLength(3);
    expect(result.current.rows.find((row) => row.rowKey === targetKey)?.isAllowed).toBe(false);
  });

  it('still seeds from an explicit ALLOW_LIST without consulting the catalogue', async () => {
    mockGet.mockResolvedValue({
      ...allowAllPlan,
      modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
      modelAccess: [
        {
          provider: 'anthropic',
          model: 'claude-sonnet-5',
          isAllowed: true,
          allowAsPrimary: true,
          allowAsFallback: true,
          allowAsJudge: false,
          allowInCompare: true,
          dailyTokenLimitOverride: null,
        },
      ],
    } as unknown as PlanView);

    const { result, rerender } = renderHook(() => useModelAccessPage(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    const seeded = result.current.rows;
    rerender();

    expect(result.current.rows).toBe(seeded);
    expect(result.current.rows[0]?.model).toBe('claude-sonnet-5');
  });
});
