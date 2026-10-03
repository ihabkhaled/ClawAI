import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SaveToContextTarget } from '@/enums/save-to-context-target.enum';
import { useMessageSaveAction } from '@/hooks/chat/use-message-save-action';

const saveMessageToContext = vi.fn();
const push = vi.fn();
const success = vi.fn();
const apiError = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { saveMessageToContext: (...args: unknown[]) => saveMessageToContext(...args) },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values?.['name'] === undefined ? key : `${key}:${values['name']}`,
  }),
}));
vi.mock('@/utilities', () => ({
  showToast: {
    success: (options: unknown) => success(options),
    apiError: (...args: unknown[]) => apiError(...args),
  },
}));

const wrapper = ({ children }: { children: ReactNode }): React.ReactElement => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe('useMessageSaveAction', () => {
  beforeEach(() => {
    saveMessageToContext.mockReset();
    push.mockReset();
    success.mockReset();
    apiError.mockReset();
  });

  it('posts the target for this message and toasts with a link to the new pack', async () => {
    saveMessageToContext.mockResolvedValue({
      status: 'SAVED',
      pack: { id: 'p1', name: 'ClawAI', created: true, link: '/context?packId=p1' },
    });
    const { result } = renderHook(() => useMessageSaveAction('a1'), { wrapper });

    act(() => result.current.save(SaveToContextTarget.CONTEXT_PACK));

    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(saveMessageToContext).toHaveBeenCalledWith('a1', { target: 'CONTEXT_PACK' });
    const toast = success.mock.calls[0]?.[0] as {
      description: string;
      action: { onClick: () => void };
    };
    expect(toast.description).toBe('chat.saveMessage.savedPack:ClawAI');
    toast.action.onClick();
    expect(push).toHaveBeenCalledWith('/context?packId=p1');
  });

  it('sends the chosen pack id when adding to an existing pack', async () => {
    saveMessageToContext.mockResolvedValue({
      status: 'SAVED',
      pack: { id: 'p9', name: 'Trips', created: false, link: '/context?packId=p9' },
    });
    const { result } = renderHook(() => useMessageSaveAction('a1'), { wrapper });

    act(() => result.current.save(SaveToContextTarget.CONTEXT_PACK, 'p9'));

    await waitFor(() => expect(saveMessageToContext).toHaveBeenCalled());
    expect(saveMessageToContext).toHaveBeenCalledWith('a1', {
      target: 'CONTEXT_PACK',
      packId: 'p9',
    });
  });

  it('saves to memory and says so', async () => {
    saveMessageToContext.mockResolvedValue({
      status: 'SAVED',
      memory: { id: 'm1', type: 'SUMMARY', preview: 'x', link: '/memory?memoryId=m1' },
    });
    const { result } = renderHook(() => useMessageSaveAction('a1'), { wrapper });

    act(() => result.current.save(SaveToContextTarget.MEMORY));

    await waitFor(() => expect(success).toHaveBeenCalled());
    const toast = success.mock.calls[0]?.[0] as { description: string };
    expect(toast.description).toBe('chat.saveMessage.savedMemory');
  });

  it('reports a refusal through the error toast and never claims success', async () => {
    saveMessageToContext.mockRejectedValue(new Error('PLAN_CONTEXT_PACK_LIMIT_EXCEEDED'));
    const { result } = renderHook(() => useMessageSaveAction('a1'), { wrapper });

    act(() => result.current.save(SaveToContextTarget.CONTEXT_PACK));

    await waitFor(() => expect(apiError).toHaveBeenCalled());
    expect(success).not.toHaveBeenCalled();
  });
});
