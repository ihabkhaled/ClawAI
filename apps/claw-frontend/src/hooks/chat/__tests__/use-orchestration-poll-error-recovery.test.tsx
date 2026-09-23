import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ClawConstants from '@/constants';
import { MessageRole } from '@/enums';
import { useConsensusPoll } from '@/hooks/chat/use-consensus-poll';
import { useEscalationPoll } from '@/hooks/chat/use-escalation-poll';
import { useParallelPoll } from '@/hooks/chat/use-parallel-poll';

// Shrink the max-poll-count backstop + interval for this file only, so the
// "polls forever" regression case for useParallelPoll runs in milliseconds
// instead of the real 60 * 3s = 180s. Everything else from '@/constants'
// passes through unchanged. The value is duplicated (not imported) because
// vi.mock factories are hoisted above the imports they'd need.
const TEST_MAX_PARALLEL_POLL_COUNT = 3;
vi.mock('@/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof ClawConstants>();
  return {
    ...actual,
    MAX_PARALLEL_POLL_COUNT: 3,
    PARALLEL_POLL_INTERVAL_MS: 5,
  };
});

// Regression coverage for the "stuck submit button" bug: the consensus,
// escalation and compare lab pages all gate their submit button on
// `!isPolling`. Before this fix, `isPolling` (`pollingEnabled`) only ever
// flipped back to `false` when the SUCCESS row showed up — a run that fails
// server-side (and writes either nothing, or an error-tagged message, but
// never the success row) left `isPolling` `true` forever, so the button
// stayed disabled forever with no way to retry.

const getMessagesPaginatedMock = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    getMessagesPaginated: (...args: unknown[]) => getMessagesPaginatedMock(...args),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const wrapper = ({ children }: PropsWithChildren): ReactElement => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const errorTaggedResponse = {
  data: [
    {
      id: 'm-error',
      role: MessageRole.ASSISTANT,
      content: 'The run failed.',
      metadata: { error: true },
    },
  ],
};

describe('orchestration poll hooks — recover from a failed run instead of polling forever', () => {
  beforeEach(() => {
    getMessagesPaginatedMock.mockReset();
  });

  it('useConsensusPoll stops polling and flags the error once an error-tagged message lands', async () => {
    getMessagesPaginatedMock.mockResolvedValue(errorTaggedResponse);

    const { result } = renderHook(() => useConsensusPoll('thread-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isConsensusError).toBe(true);
    });
    expect(result.current.isPolling).toBe(false);
    expect(result.current.isSynthesisReady).toBe(false);
  });

  it('useEscalationPoll stops polling and flags the error once an error-tagged message lands', async () => {
    getMessagesPaginatedMock.mockResolvedValue(errorTaggedResponse);

    const { result } = renderHook(() => useEscalationPoll('thread-2'), { wrapper });

    await waitFor(() => {
      expect(result.current.isEscalationError).toBe(true);
    });
    expect(result.current.isPolling).toBe(false);
  });

  it('useParallelPoll trips its max-poll backstop instead of polling forever when no lane ever responds', async () => {
    // Every poll returns zero parallelExecution-tagged messages — the shape
    // a run takes when it fails before writing anything for any lane.
    getMessagesPaginatedMock.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useParallelPoll('thread-3', 2), { wrapper });

    await waitFor(() => {
      expect(result.current.isParallelError).toBe(true);
    });
    expect(result.current.isPolling).toBe(false);
    expect(result.current.allResponded).toBe(false);
    // Sanity: the backstop actually ran close to the (shrunk) max poll
    // count rather than tripping on the first call by accident.
    expect(getMessagesPaginatedMock.mock.calls.length).toBeGreaterThanOrEqual(
      TEST_MAX_PARALLEL_POLL_COUNT,
    );
  });
});
