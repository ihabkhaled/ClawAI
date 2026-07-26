import { useCallback, useEffect, useState } from 'react';

import { CHAT_SHARE_COPY_FEEDBACK_MS } from '@/constants/chat-share.constants';
import { ChatShareConfirmAction, ChatShareVisibility } from '@/enums/chat-share.enum';
import { useChatShare } from '@/hooks/chat-shares/use-chat-share';
import { useChatShareMutations } from '@/hooks/chat-shares/use-chat-share-mutations';
import type { UseShareChatDialogReturn } from '@/types/chat-share-hook.types';
import { copyTextToClipboard } from '@/utilities/clipboard.utility';

/**
 * Controller for the share dialog.
 *
 * Two deliberate design points:
 *
 * 1. `hasAcknowledged` starts **false** and is never pre-checked. Publishing puts
 *    a private conversation on the open internet; a pre-ticked box would make
 *    that a mis-click rather than a decision.
 * 2. Disable and regenerate route through `confirming` before they run. Both are
 *    irreversible from the owner's point of view — a regenerated URL can never be
 *    recovered — so neither fires on a single click.
 *
 * `allowIndexing` is seeded from the server's answer once a share exists, so
 * reopening the dialog shows the real state rather than a stale local default.
 */
export function useShareChatDialog(threadId: string | null): UseShareChatDialogReturn {
  const query = useChatShare(threadId);
  const mutations = useChatShareMutations(threadId);
  const [isOpen, setIsOpen] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [allowIndexing, setAllowIndexing] = useState(false);
  const [confirming, setConfirming] = useState<ChatShareConfirmAction | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Mirror the server's indexing state whenever it changes, including after a
  // safety scan silently downgrades an indexed share to unlisted.
  useEffect(() => {
    if (query.share !== null) {
      setAllowIndexing(query.share.visibility === ChatShareVisibility.PUBLIC_INDEXED);
    }
  }, [query.share]);

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }
    const timer = setTimeout(() => setIsCopied(false), CHAT_SHARE_COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setConfirming(null);
    // Reset the acknowledgement so the next publish is a fresh decision rather
    // than one inherited from a dialog the owner closed without acting.
    setHasAcknowledged(false);
    mutations.clearError();
  }, [mutations]);

  const toggleAcknowledged = useCallback(() => {
    setHasAcknowledged((previous) => !previous);
  }, []);

  const toggleAllowIndexing = useCallback(() => {
    const next = !allowIndexing;
    setAllowIndexing(next);
    // Only an already-published share can change indexing on the server; before
    // publication this is just the value the publish request will carry.
    if (query.share !== null) {
      mutations.setIndexing(next);
    }
  }, [allowIndexing, mutations, query.share]);

  const requestConfirm = useCallback((action: ChatShareConfirmAction) => {
    setConfirming(action);
  }, []);

  const cancelConfirm = useCallback(() => setConfirming(null), []);

  const confirm = useCallback(() => {
    if (confirming === ChatShareConfirmAction.DISABLE) {
      mutations.revoke();
    } else if (confirming === ChatShareConfirmAction.REGENERATE) {
      mutations.regenerateUrl();
    }
    setConfirming(null);
  }, [confirming, mutations]);

  const copyUrl = useCallback(() => {
    if (query.share === null) {
      return;
    }
    void copyTextToClipboard(query.share.publicUrl).then((ok) => setIsCopied(ok));
  }, [query.share]);

  return {
    ...query,
    ...mutations,
    isOpen,
    open,
    close,
    hasAcknowledged,
    toggleAcknowledged,
    allowIndexing,
    toggleAllowIndexing,
    confirming,
    requestConfirm,
    cancelConfirm,
    confirm,
    isCopied,
    copyUrl,
  };
}
