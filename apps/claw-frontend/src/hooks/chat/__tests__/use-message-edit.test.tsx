import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMessageEdit } from '@/hooks/chat/use-message-edit';

const mockEditMessage = vi.fn();
const mockSuccess = vi.fn();
const mockApiError = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    editMessage: (...args: unknown[]) => mockEditMessage(...args),
  },
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

describe('useMessageEdit', () => {
  beforeEach(() => {
    mockEditMessage.mockReset().mockResolvedValue({ id: 'msg-1' });
    mockSuccess.mockReset();
    mockApiError.mockReset();
  });

  it('refuses to save a draft that changes nothing', () => {
    // Otherwise a stray click deletes the rest of the thread and spends tokens
    // re-running a prompt that did not change.
    const { result } = renderHook(() => useMessageEdit('msg-1', 'first draft'), { wrapper });

    expect(result.current.canSave).toBe(false);

    act(() => result.current.save());

    expect(mockEditMessage).not.toHaveBeenCalled();
  });

  it('refuses a draft that is only whitespace', () => {
    const { result } = renderHook(() => useMessageEdit('msg-1', 'first draft'), { wrapper });

    act(() => result.current.setDraft('   '));

    expect(result.current.canSave).toBe(false);
  });

  it('sends the trimmed draft and reports success', async () => {
    const { result } = renderHook(() => useMessageEdit('msg-1', 'first draft'), { wrapper });

    act(() => result.current.setDraft('  second draft  '));
    expect(result.current.canSave).toBe(true);
    act(() => result.current.save());

    await waitFor(() => expect(mockEditMessage).toHaveBeenCalledWith('msg-1', 'second draft'));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isOpen).toBe(false));
  });

  it('reseeds the draft on open, so a cancelled attempt does not come back', () => {
    // Reopening should show the message as it stands, not the abandoned edit.
    const { result } = renderHook(() => useMessageEdit('msg-1', 'first draft'), { wrapper });

    act(() => result.current.setDraft('abandoned'));
    act(() => result.current.close());
    act(() => result.current.open());

    expect(result.current.draft).toBe('first draft');
    expect(result.current.isOpen).toBe(true);
  });

  it('routes a failure through the translated error map rather than swallowing it', async () => {
    mockEditMessage.mockRejectedValue({ code: 'MESSAGE_NOT_EDITABLE' });
    const { result } = renderHook(() => useMessageEdit('msg-1', 'first draft'), { wrapper });

    act(() => result.current.open());
    act(() => result.current.setDraft('second draft'));
    act(() => result.current.save());

    await waitFor(() => expect(mockApiError).toHaveBeenCalled());
    // The dialog stays open on failure. Closing it would discard the text the
    // person just typed, with nowhere to recover it from.
    expect(result.current.isOpen).toBe(true);
    expect(result.current.draft).toBe('second draft');
  });
});
