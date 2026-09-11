import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSendMessage } from '@/hooks/chat/use-send-message';
import { queryKeys } from '@/repositories/shared/query-keys';
import { ApiClientError } from '@/services/shared/api-client';

const mockCreateMessage = vi.fn();
const mockToastError = vi.fn();
const mockInsertSentMessageIntoCache = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { createMessage: (...args: unknown[]) => mockCreateMessage(...args) },
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => `t:${key}` }) }));
vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { error: (...args: unknown[]) => mockToastError(...args) },
  insertSentMessageIntoCache: (...args: unknown[]) => mockInsertSentMessageIntoCache(...args),
}));

describe('useSendMessage', () => {
  it('shows the localized trial error and stops the waiting state on POST rejection', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const stopWaiting = vi.fn();
    const error = new ApiClientError({
      message: 'Your free trial has expired',
      status: 403,
      code: 'PLAN_TRIAL_EXPIRED',
    });
    mockCreateMessage.mockRejectedValue(error);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSendMessage('thread-1', undefined, stopWaiting), {
      wrapper,
    });

    act(() => result.current.sendMessage({ threadId: 'thread-1', content: 'hello' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(stopWaiting).toHaveBeenCalledOnce();
    expect(result.current.errorMessage).toBe('t:chat.errors.planTrialExpired');
    expect(mockToastError).toHaveBeenCalledWith({
      title: 't:common.error',
      description: 't:chat.errors.planTrialExpired',
    });
  });

  // `POST /chat-messages` returns the authoritative row, so a successful send
  // writes it straight into the cache instead of discarding it and asking the
  // network for it back — that round trip used to be the reason the user's own
  // message was invisible until the next poll landed.
  it('writes the created message into the cache instead of invalidating and refetching', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const createdMessage = { id: 'msg-1', threadId: 'thread-1', content: 'hello' };
    mockCreateMessage.mockResolvedValue(createdMessage);
    const onSent = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSendMessage('thread-1', onSent), { wrapper });

    act(() => result.current.sendMessage({ threadId: 'thread-1', content: 'hello' }));
    await waitFor(() => expect(onSent).toHaveBeenCalledOnce());

    expect(mockInsertSentMessageIntoCache).toHaveBeenCalledWith(
      queryClient,
      'thread-1',
      createdMessage,
    );
    // The infinite query the thread page renders from must NOT be invalidated
    // here — doing so would trigger the exact network round trip the direct
    // cache write exists to avoid, immediately discarding what was just
    // written.
    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidatedKeys).not.toContainEqual(queryKeys.threads.messagesInfinite('thread-1'));
    // The orchestration poll hooks read a different cache shape and still
    // need their own invalidation.
    expect(invalidatedKeys).toContainEqual(queryKeys.threads.messagesAnyPage('thread-1'));
  });
});
