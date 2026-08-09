import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSendMessage } from '@/hooks/chat/use-send-message';
import { ApiClientError } from '@/services/shared/api-client';

const mockCreateMessage = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { createMessage: (...args: unknown[]) => mockCreateMessage(...args) },
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => `t:${key}` }) }));
vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { error: (...args: unknown[]) => mockToastError(...args) },
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
});
