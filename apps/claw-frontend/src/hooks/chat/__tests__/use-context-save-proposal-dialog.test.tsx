import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CHAT_COMPOSER_INPUT_ID } from '@/constants/context-save.constants';
import { useContextSaveProposalDialog } from '@/hooks/chat/use-context-save-proposal-dialog';
import type { ContextSaveProposal } from '@/types';

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { confirmContextSave: vi.fn(), dismissContextSave: vi.fn() },
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const PROPOSAL: ContextSaveProposal = {
  memory: { type: 'FACT', text: 'tea' },
  pack: null,
  options: [],
};

function setup(onClose = vi.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: new QueryClient() }, children);
  const hook = renderHook(
    () =>
      useContextSaveProposalDialog({
        messageId: 'a-1',
        threadId: 't-1',
        proposal: PROPOSAL,
        onClose,
      }),
    { wrapper },
  );
  return { ...hook, onClose };
}

describe('useContextSaveProposalDialog (ADR-168)', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('hands focus back to the composer when the dialog closes', () => {
    const composer = document.createElement('textarea');
    composer.id = CHAT_COMPOSER_INPUT_ID;
    document.body.append(composer);
    const { result } = setup();
    const event = new Event('focusout', { cancelable: true });

    act(() => result.current.onCloseAutoFocus(event));

    expect(document.activeElement).toBe(composer);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves the default focus handling alone when there is no composer', () => {
    const { result } = setup();
    const event = new Event('focusout', { cancelable: true });

    act(() => result.current.onCloseAutoFocus(event));

    expect(event.defaultPrevented).toBe(false);
  });

  it('closes on request without discarding the proposal', () => {
    const { result, onClose } = setup();

    act(() => result.current.onOpenChange(true));
    expect(onClose).not.toHaveBeenCalled();
    act(() => result.current.onOpenChange(false));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call save when the form is invalid', () => {
    const { result } = setup();

    act(() => result.current.form.setMemoryText(''));
    act(() => result.current.onSave());

    expect(result.current.form.canSave).toBe(false);
    expect(result.current.actions.isConfirming).toBe(false);
  });
});
