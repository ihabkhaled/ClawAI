'use client';

import { ContextSaveProposalDialog } from '@/components/chat/context-save-proposal-dialog';
import { useContextSaveProposalHost } from '@/hooks/chat/use-context-save-proposal-host';
import type { ContextSaveProposalHostProps } from '@/types';

/**
 * Mounts the "Remember this" dialog for the thread page (ADR-168). Renders
 * nothing unless the open answer still carries a proposal, so a save, a
 * dismissal or a reload closes it by itself. Keyed by message so one answer's
 * edits never leak into the next form.
 */
export function ContextSaveProposalHost(
  props: ContextSaveProposalHostProps,
): React.ReactElement | null {
  const { target, close } = useContextSaveProposalHost(props);
  if (target === null) {
    return null;
  }
  return (
    <ContextSaveProposalDialog
      key={target.messageId}
      messageId={target.messageId}
      threadId={props.threadId}
      proposal={target.proposal}
      onClose={close}
    />
  );
}
