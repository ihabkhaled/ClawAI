import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { MessageRole } from '@/enums';
import { useContextSaveProposalHost } from '@/hooks/chat/use-context-save-proposal-host';
import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';
import type { ChatMessage, ContextSaveProposal, UseContextSaveProposalHostParams } from '@/types';

/** The hook's params with `isFetching` defaulting to settled, as most cases want. */
type HostProps = Omit<UseContextSaveProposalHostParams, 'isFetching'> & { isFetching?: boolean };

const PROPOSAL: ContextSaveProposal = {
  memory: { type: 'FACT', text: 'The user is vegetarian.' },
  pack: null,
  options: [],
};

const answer = (id: string, status?: string): ChatMessage =>
  ({
    id,
    threadId: 't-1',
    role: MessageRole.ASSISTANT,
    content: 'ok',
    metadata:
      status === undefined
        ? null
        : { contextSave: { status, ...(status === 'PROPOSED' ? { proposal: PROPOSAL } : {}) } },
  }) as unknown as ChatMessage;

const userMessage = (id: string): ChatMessage =>
  ({ id, threadId: 't-1', role: MessageRole.USER, content: 'hi', metadata: null }) as ChatMessage;

const setup = (initial: HostProps) =>
  renderHook((props: HostProps) => useContextSaveProposalHost({ isFetching: false, ...props }), {
    initialProps: initial,
  });

describe('useContextSaveProposalHost (ADR-168)', () => {
  beforeEach(() => {
    useContextSaveProposalStore.getState().close();
  });

  it('opens once when a new answer arrives with a proposal', () => {
    const history = [userMessage('u-1'), answer('a-1', 'SAVED')];
    const { result, rerender } = setup({ threadId: 't-1', messages: history, isReady: true });
    expect(result.current.target).toBeNull();

    rerender({
      threadId: 't-1',
      messages: [...history, userMessage('u-2'), answer('a-2', 'PROPOSED')],
      isReady: true,
    });

    expect(result.current.target?.messageId).toBe('a-2');
    expect(result.current.target?.proposal.memory?.text).toBe('The user is vegetarian.');
  });

  it('opens when the proposal lands on an answer that was already on screen without one', () => {
    const { result, rerender } = setup({
      threadId: 't-1',
      messages: [userMessage('u-1')],
      isReady: true,
    });
    rerender({ threadId: 't-1', messages: [userMessage('u-1'), answer('a-1')], isReady: true });
    expect(result.current.target).toBeNull();

    rerender({
      threadId: 't-1',
      messages: [userMessage('u-1'), answer('a-1', 'PROPOSED')],
      isReady: true,
    });

    expect(result.current.target?.messageId).toBe('a-1');
  });

  it('never opens for history that was already in the thread (a reload)', () => {
    const messages = [userMessage('u-1'), answer('a-1', 'PROPOSED')];

    const { result, rerender } = setup({ threadId: 't-1', messages, isReady: true });
    rerender({ threadId: 't-1', messages: [...messages], isReady: true });

    expect(result.current.target).toBeNull();
    expect(useContextSaveProposalStore.getState().openMessageId).toBeNull();
  });

  it('waits for the first load before deciding what is history', () => {
    const messages = [userMessage('u-1'), answer('a-1', 'PROPOSED')];
    const { result, rerender } = setup({ threadId: 't-1', messages: [], isReady: false });

    rerender({ threadId: 't-1', messages, isReady: true });

    expect(result.current.target).toBeNull();
  });

  it('does not reopen after the user closes it', () => {
    const history = [userMessage('u-1')];
    const next = [...history, answer('a-1', 'PROPOSED')];
    const { result, rerender } = setup({ threadId: 't-1', messages: history, isReady: true });
    rerender({ threadId: 't-1', messages: next, isReady: true });
    expect(result.current.target).not.toBeNull();

    result.current.close();
    rerender({ threadId: 't-1', messages: [...next], isReady: true });

    expect(result.current.target).toBeNull();
  });

  it('only considers the latest message', () => {
    const history = [userMessage('u-1')];
    const { result, rerender } = setup({ threadId: 't-1', messages: history, isReady: true });

    // An older page of history prepends a proposed answer; the latest is unchanged.
    rerender({
      threadId: 't-1',
      messages: [answer('a-0', 'PROPOSED'), ...history],
      isReady: true,
    });

    expect(result.current.target).toBeNull();
  });

  it('ignores a proposal on anything but an assistant answer, and other statuses', () => {
    const history = [userMessage('u-1')];
    const { result, rerender } = setup({ threadId: 't-1', messages: history, isReady: true });

    rerender({ threadId: 't-1', messages: [...history, answer('a-1', 'SAVED')], isReady: true });
    expect(result.current.target).toBeNull();
    rerender({
      threadId: 't-1',
      messages: [...history, answer('a-1', 'NEEDS_PACK_CHOICE')],
      isReady: true,
    });
    expect(result.current.target).toBeNull();
  });

  it('opens from the card through the store, for old messages too', () => {
    const messages = [userMessage('u-1'), answer('a-1', 'PROPOSED')];
    const { result } = setup({ threadId: 't-1', messages, isReady: true });
    expect(result.current.target).toBeNull();

    useContextSaveProposalStore.getState().open('a-1');
    const { result: reopened } = setup({ threadId: 't-1', messages, isReady: true });

    expect(reopened.current.target?.messageId).toBe('a-1');
  });

  it('drops the target once the answer is no longer proposed', () => {
    const history = [userMessage('u-1')];
    const { result, rerender } = setup({ threadId: 't-1', messages: history, isReady: true });
    rerender({ threadId: 't-1', messages: [...history, answer('a-1', 'PROPOSED')], isReady: true });
    expect(result.current.target).not.toBeNull();

    rerender({ threadId: 't-1', messages: [...history, answer('a-1', 'SAVED')], isReady: true });

    expect(result.current.target).toBeNull();
  });

  it('does not baseline a stale cached copy: waits until the first fetch settles', () => {
    // The cache still holds the thread as it was; while the fetch runs, the answer
    // that arrived meanwhile is not in it. Baselining the cache would let that
    // answer open the dialog as if it had just arrived.
    const cached = [userMessage('u-1')];
    const { result, rerender } = setup({
      threadId: 't-1',
      messages: cached,
      isReady: true,
      isFetching: true,
    });
    expect(result.current.target).toBeNull();

    rerender({
      threadId: 't-1',
      messages: [...cached, answer('a-1', 'PROPOSED')],
      isReady: true,
      isFetching: false,
    });

    expect(result.current.target).toBeNull();
    expect(useContextSaveProposalStore.getState().openMessageId).toBeNull();
  });

  it('still opens for an answer that arrives after the first fetch settled', () => {
    const cached = [userMessage('u-1')];
    const { result, rerender } = setup({
      threadId: 't-1',
      messages: cached,
      isReady: true,
      isFetching: true,
    });
    rerender({ threadId: 't-1', messages: cached, isReady: true, isFetching: false });

    rerender({
      threadId: 't-1',
      messages: [...cached, answer('a-1', 'PROPOSED')],
      isReady: true,
      isFetching: true,
    });
    rerender({
      threadId: 't-1',
      messages: [...cached, answer('a-1', 'PROPOSED')],
      isReady: true,
      isFetching: false,
    });

    expect(result.current.target?.messageId).toBe('a-1');
  });

  it('keeps the dialog on the last proposal while its own save is in flight', () => {
    const history = [userMessage('u-1')];
    const { result, rerender } = setup({ threadId: 't-1', messages: history, isReady: true });
    rerender({ threadId: 't-1', messages: [...history, answer('a-1', 'PROPOSED')], isReady: true });
    expect(result.current.target?.messageId).toBe('a-1');

    // The save is under way: a refetch shows the record as SAVING, then nothing proposes.
    act(() => useContextSaveProposalStore.getState().setBusy(true));
    rerender({ threadId: 't-1', messages: [...history, answer('a-1', 'SAVING')], isReady: true });
    expect(result.current.target?.messageId).toBe('a-1');
    expect(result.current.target?.proposal.memory?.text).toBe('The user is vegetarian.');

    act(() => useContextSaveProposalStore.getState().setBusy(false));
    expect(result.current.target).toBeNull();
  });

  it('does not hold a target for a dialog that was never shown', () => {
    const history = [userMessage('u-1')];
    const { result, rerender } = setup({ threadId: 't-1', messages: history, isReady: true });
    act(() => useContextSaveProposalStore.getState().setBusy(true));

    rerender({ threadId: 't-1', messages: [...history, answer('a-1', 'SAVING')], isReady: true });

    expect(result.current.target).toBeNull();
  });

  it('treats a different thread as a fresh baseline', () => {
    const { result, rerender } = setup({
      threadId: 't-1',
      messages: [userMessage('u-1')],
      isReady: true,
    });

    rerender({
      threadId: 't-2',
      messages: [userMessage('u-9'), answer('a-9', 'PROPOSED')],
      isReady: true,
    });

    expect(result.current.target).toBeNull();
  });
});
