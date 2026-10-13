'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';
import type {
  ContextSaveProposalTarget,
  UseContextSaveProposalHostParams,
  UseContextSaveProposalHostReturn,
} from '@/types';
import { proposalTargetOfMessage } from '@/utilities/context-save-proposal.utility';

/**
 * Decides when the "Remember this" dialog is open (ADR-168).
 *
 * It opens by itself exactly once for an answer that arrives in front of the
 * user and carries a proposal. Whatever was already in the thread when it was
 * opened (a reload, a navigation back) is history: it gets the card with a
 * "Review and save" button instead, because a modal that appears on its own for
 * an old message is an ambush. The baseline is taken only after the first fetch
 * has settled - a cached copy shown while that fetch runs may be stale, and
 * baselining it would let an answer that arrived meanwhile open the dialog.
 * Only the latest message qualifies, so loading older pages of history can never
 * open it either.
 */
export function useContextSaveProposalHost({
  threadId,
  messages,
  isReady,
  isFetching,
}: UseContextSaveProposalHostParams): UseContextSaveProposalHostReturn {
  const openMessageId = useContextSaveProposalStore((state) => state.openMessageId);
  const isBusy = useContextSaveProposalStore((state) => state.isBusy);
  const open = useContextSaveProposalStore((state) => state.open);
  const close = useContextSaveProposalStore((state) => state.close);
  const baselineThreadId = useRef<string | null>(null);
  const historyIds = useRef<Set<string>>(new Set());
  const autoOpenedIds = useRef<Set<string>>(new Set());
  const [lastTarget, setLastTarget] = useState<ContextSaveProposalTarget | null>(null);

  // A different thread is a different conversation: nothing carries over.
  useEffect(() => {
    return () => {
      baselineThreadId.current = null;
      historyIds.current = new Set();
      autoOpenedIds.current = new Set();
      close();
    };
  }, [threadId, close]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (baselineThreadId.current !== threadId) {
      if (isFetching) {
        return;
      }
      baselineThreadId.current = threadId;
      historyIds.current = new Set(messages.map((message) => message.id));
      return;
    }
    const latest = messages.at(-1);
    if (
      latest === undefined ||
      historyIds.current.has(latest.id) ||
      autoOpenedIds.current.has(latest.id)
    ) {
      return;
    }
    if (proposalTargetOfMessage(latest) !== null) {
      autoOpenedIds.current.add(latest.id);
      open(latest.id);
    }
  }, [isReady, isFetching, threadId, messages, open]);

  const openMessage =
    openMessageId === null ? undefined : messages.find((message) => message.id === openMessageId);
  const current = useMemo(() => proposalTargetOfMessage(openMessage), [openMessage]);

  if (current !== null && lastTarget !== current) {
    // Remembering the last proposal shown while rendering is React's way to derive state.
    setLastTarget(current);
  }

  // While the dialog's own save is in flight a refetch can show the record as
  // SAVING for a moment; keep the dialog (and its edits and outcome) mounted
  // on the last proposal it showed instead of unmounting it mid-save.
  if (current === null && isBusy && lastTarget?.messageId === openMessageId) {
    return { target: lastTarget, close };
  }
  return { target: current, close };
}
