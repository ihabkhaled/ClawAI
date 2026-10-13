'use client';

import { useEffect, useState } from 'react';

import { CONTEXT_SAVE_MODE_ASK, CONTEXT_SAVE_MODE_AUTO } from '@/constants/context-save.constants';
import { useContextSaveMode } from '@/hooks/chat/use-context-save-mode';
import { useContextSaveProposalActions } from '@/hooks/chat/use-context-save-proposal-actions';
import { useContextSaveProposalForm } from '@/hooks/chat/use-context-save-proposal-form';
import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';
import type { ContextSaveProposalDialogProps, UseContextSaveProposalDialogReturn } from '@/types';
import { focusChatComposer } from '@/utilities/chat-composer-focus.utility';

/**
 * Everything the "Remember this" dialog needs (ADR-168): the form, the
 * confirm/dismiss calls, the per-viewer "always save" choice, and the focus
 * hand-back to the composer when it closes.
 */
export function useContextSaveProposalDialog({
  messageId,
  threadId,
  proposal,
  onClose,
}: ContextSaveProposalDialogProps): UseContextSaveProposalDialogReturn {
  const form = useContextSaveProposalForm(proposal);
  const actions = useContextSaveProposalActions(messageId, threadId, onClose);
  const saveMode = useContextSaveMode();
  const setBusy = useContextSaveProposalStore((state) => state.setBusy);
  const busy = actions.isConfirming || actions.isDismissing;
  // The tick is only a draft of the choice: it is written when Save is pressed,
  // so closing or "Not now" never changes how later messages are saved.
  const [alwaysAuto, setAlwaysAuto] = useState(saveMode.mode === CONTEXT_SAVE_MODE_AUTO);

  // While this dialog's own call is in flight the thread page must keep it
  // mounted, even if a refetch shows the record as SAVING for a moment.
  useEffect(() => {
    setBusy(busy);
    return () => setBusy(false);
  }, [busy, setBusy]);

  return {
    form,
    actions,
    alwaysAuto,
    onAlwaysAutoChange: setAlwaysAuto,
    onSave: () => {
      if (form.request !== null && !busy) {
        saveMode.setMode(alwaysAuto ? CONTEXT_SAVE_MODE_AUTO : CONTEXT_SAVE_MODE_ASK);
        actions.confirm(form.request);
      }
    },
    // Closing with X or Escape keeps the proposal: the card stays so the user can
    // come back. Only "Not now" discards it. While a call is in flight the
    // dialog stays put so the outcome is not lost.
    onOpenChange: (open) => {
      if (!open && !busy) {
        onClose();
      }
    },
    onCloseAutoFocus: (event) => {
      if (focusChatComposer()) {
        event.preventDefault();
      }
    },
  };
}
