import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBranchThread } from '@/hooks/chat/use-branch-thread';

const mockBranchThread = vi.fn();
const mockPush = vi.fn();
const mockSuccess = vi.fn();
const mockApiError = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    branchThread: (...args: unknown[]) => mockBranchThread(...args),
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/utilities', () => ({
  showToast: {
    success: (...args: unknown[]) => mockSuccess(...args),
    apiError: (...args: unknown[]) => mockApiError(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useBranchThread', () => {
  beforeEach(() => {
    mockBranchThread.mockReset().mockResolvedValue({ id: 'thread-branch' });
    mockPush.mockReset();
    mockSuccess.mockReset();
    mockApiError.mockReset();
  });

  it('opens the branch, because a copy nobody can see looks like nothing happened', async () => {
    const { result } = renderHook(() => useBranchThread('thread-1'), { wrapper });

    act(() => result.current.branchFrom('msg-3'));

    await waitFor(() => expect(mockBranchThread).toHaveBeenCalledWith('thread-1', 'msg-3'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/chat/thread-branch'));
    expect(mockSuccess).toHaveBeenCalled();
  });

  it('stays where it is when the branch fails', async () => {
    mockBranchThread.mockRejectedValue({ code: 'PLAN_DAILY_CHAT_LIMIT_EXCEEDED' });
    const { result } = renderHook(() => useBranchThread('thread-1'), { wrapper });

    act(() => result.current.branchFrom('msg-3'));

    await waitFor(() => expect(mockApiError).toHaveBeenCalled());
    // Navigating to a thread that was never created would show an empty page
    // and hide the reason it is empty.
    expect(mockPush).not.toHaveBeenCalled();
  });
});
