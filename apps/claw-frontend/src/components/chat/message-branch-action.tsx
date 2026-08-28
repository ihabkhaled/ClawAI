'use client';

import { GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useBranchThread } from '@/hooks/chat/use-branch-thread';
import { useTranslation } from '@/lib/i18n';
import type { MessageBranchActionProps } from '@/types';

/**
 * Forks the conversation at this message.
 *
 * No confirmation, unlike editing: nothing is lost. The original thread stays
 * exactly as it was and the branch opens beside it, which is the whole reason
 * to reach for this instead of an edit.
 */
export function MessageBranchAction({
  threadId,
  messageId,
}: MessageBranchActionProps): React.ReactElement {
  const { t } = useTranslation();
  const branch = useBranchThread(threadId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => branch.branchFrom(messageId)}
      disabled={branch.isPending}
      aria-label={t('chat.branch.action')}
      title={t('chat.branch.action')}
      className="text-muted-foreground h-7 w-7"
    >
      <GitBranch className="h-3.5 w-3.5" />
    </Button>
  );
}
