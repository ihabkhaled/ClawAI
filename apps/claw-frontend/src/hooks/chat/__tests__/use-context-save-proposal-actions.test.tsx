import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useContextSaveProposalActions } from '@/hooks/chat/use-context-save-proposal-actions';
import { ApiClientError } from '@/services/shared/api-client';
import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';

const mockConfirm = vi.fn();
const mockDismiss = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    confirmContextSave: (...args: unknown[]) => mockConfirm(...args),
    dismissContextSave: (...args: unknown[]) => mockDismiss(...args),
  },
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/utilities', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    showToast: { success: (...args: unknown[]) => mockToastSuccess(...args), apiError: vi.fn() },
  };
});

const REQUEST = { memory: { type: 'FACT' as const, text: 'tea' }, pack: null };

function setup(onDone = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  const hook = renderHook(() => useContextSaveProposalActions('a-1', 't-1', onDone), { wrapper });
  return { ...hook, onDone, invalidate, wrapper };
}

describe('useContextSaveProposalActions (ADR-168)', () => {
  beforeEach(() => {
    mockConfirm.mockReset();
    mockDismiss.mockReset();
    mockToastSuccess.mockReset();
    useContextSaveProposalStore.getState().close();
  });

  it('confirms the edited request for this answer, refreshes the thread and closes', async () => {
    mockConfirm.mockResolvedValue({ status: 'SAVED' });
    const { result, onDone, invalidate } = setup();

    act(() => result.current.confirm(REQUEST));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(mockConfirm).toHaveBeenCalledWith('a-1', REQUEST);
    expect(mockToastSuccess).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalled();
    expect(result.current.errorMessage).toBeNull();
  });

  it('does not call a half-saved confirm a success: no toast, dialog stays, reason shown', async () => {
    mockConfirm.mockResolvedValue({
      status: 'PROPOSED',
      proposalError: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
      proposal: { memory: null, pack: null, options: [] },
    });
    const { result, onDone, invalidate } = setup();

    act(() => result.current.confirm(REQUEST));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        'chat.contextSave.proposal.partialFailed chat.contextSave.reasons.LIMIT',
      ),
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalled();
  });

  it('gives the generic line when a half-saved confirm has no known reason code', async () => {
    mockConfirm.mockResolvedValue({ status: 'PROPOSED' });
    const { result, onDone } = setup();

    act(() => result.current.confirm(REQUEST));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('chat.contextSave.proposal.partialFailed'),
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it('maps every known proposalError code to its own reason', async () => {
    mockConfirm
      .mockResolvedValueOnce({ status: 'PROPOSED', proposalError: 'PLAN_FEATURE_DISABLED' })
      .mockResolvedValueOnce({ status: 'PROPOSED', proposalError: 'CONTEXT_SAVE_UNAVAILABLE' });
    const { result } = setup();

    act(() => result.current.confirm(REQUEST));
    await waitFor(() =>
      expect(result.current.errorMessage).toContain('chat.contextSave.reasons.PLAN'),
    );
    act(() => result.current.confirm(REQUEST));
    await waitFor(() =>
      expect(result.current.errorMessage).toContain('chat.contextSave.reasons.UNAVAILABLE'),
    );
  });

  it('closes quietly, without a toast, when the record is no longer proposed', async () => {
    mockConfirm.mockResolvedValue({ status: 'DISMISSED' });
    const { result, onDone } = setup();

    act(() => result.current.confirm(REQUEST));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('clears the half-saved reason as soon as the user tries again', async () => {
    mockConfirm
      .mockResolvedValueOnce({ status: 'PROPOSED', proposalError: 'CONTEXT_SAVE_UNAVAILABLE' })
      .mockResolvedValueOnce({ status: 'SAVED' });
    const { result, onDone } = setup();

    act(() => result.current.confirm(REQUEST));
    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    act(() => result.current.confirm(REQUEST));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(result.current.errorMessage).toBeNull();
    expect(mockToastSuccess).toHaveBeenCalledOnce();
  });

  it('refreshes the thread when confirm throws, so the card shows what is stored', async () => {
    mockConfirm.mockRejectedValue(new Error('boom'));
    const { result, invalidate } = setup();

    act(() => result.current.confirm(REQUEST));

    await waitFor(() => expect(result.current.errorMessage).toBe('boom'));
    expect(invalidate).toHaveBeenCalled();
  });

  it('keeps the dialog open and says what went wrong when confirm fails', async () => {
    mockConfirm.mockRejectedValue(
      new ApiClientError({ message: 'x', status: 409, code: 'CONTEXT_SAVE_NOT_PENDING' }),
    );
    const { result, onDone } = setup();

    act(() => result.current.confirm(REQUEST));

    await waitFor(() => expect(result.current.errorMessage).toBe('chat.contextSave.notPending'));
    expect(onDone).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it.each([
    ['PLAN_FEATURE_DISABLED', 'chat.contextSave.reasons.PLAN'],
    ['PLAN_CONTEXT_PACK_LIMIT_EXCEEDED', 'chat.contextSave.reasons.LIMIT'],
    ['CONTEXT_SAVE_UNAVAILABLE', 'chat.contextSave.reasons.UNAVAILABLE'],
  ])('words a total failure with code %s the same way a half-save does', async (code, reason) => {
    mockConfirm.mockRejectedValue(new ApiClientError({ message: 'x', status: 403, code }));
    const { result, onDone } = setup();

    act(() => result.current.confirm(REQUEST));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(`chat.contextSave.proposal.partialFailed ${reason}`),
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it('keeps the failure reason when the dialog remounts, and drops it on the next attempt', async () => {
    mockConfirm
      .mockRejectedValueOnce(
        new ApiClientError({ message: 'x', status: 403, code: 'PLAN_FEATURE_DISABLED' }),
      )
      .mockResolvedValueOnce({ status: 'SAVED' });
    const first = setup();

    act(() => first.result.current.confirm(REQUEST));
    await waitFor(() => expect(first.result.current.errorMessage).not.toBeNull());
    first.unmount();

    // A new instance for the same message, as when the dialog is mounted again.
    const second = setup();
    expect(second.result.current.errorMessage).toContain('chat.contextSave.reasons.PLAN');
    act(() => second.result.current.confirm(REQUEST));
    expect(second.result.current.errorMessage).toBeNull();
    await waitFor(() => expect(second.onDone).toHaveBeenCalledOnce());
  });

  it("does not show one message's failure on another message", async () => {
    mockConfirm.mockRejectedValue(new Error('boom'));
    const first = setup();
    act(() => first.result.current.confirm(REQUEST));
    await waitFor(() => expect(first.result.current.errorMessage).toBe('boom'));

    const other = renderHook(() => useContextSaveProposalActions('a-2', 't-1', vi.fn()), {
      wrapper: first.wrapper,
    });
    expect(other.result.current.errorMessage).toBeNull();
  });

  it('clears the held reason when the store is closed', async () => {
    mockConfirm.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.confirm(REQUEST));
    await waitFor(() => expect(result.current.errorMessage).toBe('boom'));

    act(() => useContextSaveProposalStore.getState().close());

    expect(result.current.errorMessage).toBeNull();
  });

  it('shows the error text of an unmapped failure, and the plain line when there is none', async () => {
    mockConfirm.mockRejectedValueOnce(new Error('boom')).mockRejectedValueOnce('');
    const { result } = setup();

    act(() => result.current.confirm(REQUEST));
    await waitFor(() => expect(result.current.errorMessage).toBe('boom'));

    act(() => result.current.confirm(REQUEST));
    await waitFor(() =>
      expect(result.current.errorMessage).toBe('chat.contextSave.proposal.failed'),
    );
  });

  it('can retry after a failure and then succeed', async () => {
    mockConfirm.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ status: 'SAVED' });
    const { result, onDone } = setup();

    act(() => result.current.confirm(REQUEST));
    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    act(() => result.current.confirm(REQUEST));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(result.current.errorMessage).toBeNull();
  });

  it('dismisses without saving, refreshes the thread and closes', async () => {
    mockDismiss.mockResolvedValue({ status: 'DISMISSED' });
    const { result, onDone, invalidate } = setup();

    act(() => result.current.dismiss());

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(mockDismiss).toHaveBeenCalledWith('a-1');
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalled();
  });

  it('keeps the dialog open when dismiss fails, and clears a stale confirm error', async () => {
    mockConfirm.mockRejectedValue(new Error('boom'));
    mockDismiss.mockRejectedValue(new Error('offline'));
    const { result, onDone } = setup();

    act(() => result.current.confirm(REQUEST));
    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    act(() => result.current.dismiss());

    await waitFor(() => expect(mockDismiss).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isDismissing).toBe(false));
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe('offline');
  });
});
