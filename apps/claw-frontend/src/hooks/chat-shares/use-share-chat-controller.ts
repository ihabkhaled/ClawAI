'use client';

import { CHAT_SHARE_ACTIONS } from '@/constants/chat-share.constants';
import { ChatShareConfirmAction, ChatShareVisibility } from '@/enums/chat-share.enum';
import { useShareChatDialog } from '@/hooks/chat-shares/use-share-chat-dialog';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { UseShareChatControllerReturn } from '@/types/chat-share-hook.types';
import {
  indexingBlockedReasonKey,
  visibilityLabelKey,
  visibilityTone,
} from '@/utilities/chat-share.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';
import { buildSharePublicationBullets } from '@/utilities/share-publication-bullets.utility';

/**
 * Turns share state into the two prop bags the header needs.
 *
 * Lives between `useShareChatDialog` (state) and the TSX (pure render) so no
 * translation call or label decision happens in a component.
 */
export function useShareChatController(threadId: string | null): UseShareChatControllerReturn {
  const { t } = useTranslation();
  const dialog = useShareChatDialog(threadId);
  const share = dialog.share;
  const visibility = share?.visibility ?? ChatShareVisibility.PRIVATE;
  const blockedKey = indexingBlockedReasonKey(share);
  const isDisabling = dialog.confirming === ChatShareConfirmAction.DISABLE;

  return {
    buttonProps: {
      label: t('chatShare.button.label'),
      isShared: share !== null,
      onClick: dialog.open,
    },
    dialogProps: {
      isOpen: dialog.isOpen,
      onOpenChange: (open: boolean): void => {
        if (!open) {
          dialog.close();
        }
      },
      title: t('chatShare.dialog.title'),
      description: t('chatShare.dialog.description'),
      error: dialog.error,
      share,
      warningProps: {
        headingLabel: t('chatShare.warning.heading'),
        bullets: buildSharePublicationBullets(t),
        acknowledgeLabel: t('chatShare.warning.acknowledge'),
        hasAcknowledged: dialog.hasAcknowledged,
        onToggleAcknowledged: dialog.toggleAcknowledged,
      },
      urlFieldProps: {
        label: t('chatShare.url.label'),
        url: share?.publicUrl ?? '',
        copyLabel: t('chatShare.url.copy'),
        copiedLabel: t('chatShare.url.copied'),
        openLabel: t('chatShare.url.open'),
        isCopied: dialog.isCopied,
        onCopy: dialog.copyUrl,
      },
      indexingProps: {
        label: t('chatShare.indexing.label'),
        description: t('chatShare.indexing.description'),
        allowIndexing: dialog.allowIndexing,
        onToggle: dialog.toggleAllowIndexing,
        isPending: dialog.pendingAction === CHAT_SHARE_ACTIONS.INDEXING,
        blockedReason: blockedKey === null ? null : t(blockedKey),
        switchId: 'chat-share-indexing',
      },
      statusProps: {
        visibilityLabel: t(visibilityLabelKey(visibility)),
        visibilityTone: visibilityTone(visibility),
        snapshotLabel: t('chatShare.status.snapshot', {
          version: String(share?.snapshotVersion ?? 0),
        }),
        lastUpdatedLabel: t('chatShare.status.lastUpdated', {
          date: formatDateTimeSafe(share?.lastSnapshotAt ?? null),
        }),
        messageCountLabel: t('chatShare.status.messages', {
          count: String(share?.messageCount ?? 0),
        }),
        unpublishedNotice:
          share?.hasUnpublishedMessages === true ? t('chatShare.status.unpublished') : null,
      },
      confirmDialogProps: {
        open: dialog.confirming !== null,
        onOpenChange: (open: boolean): void => {
          if (!open) {
            dialog.cancelConfirm();
          }
        },
        title: isDisabling ? t('chatShare.disable.title') : t('chatShare.regenerate.title'),
        description: isDisabling
          ? t('chatShare.disable.description')
          : t('chatShare.regenerate.description'),
        confirmLabel: isDisabling
          ? t('chatShare.disable.confirm')
          : t('chatShare.regenerate.confirm'),
        cancelLabel: t('common.cancel'),
        onConfirm: dialog.confirm,
        destructive: true,
      },
      publishLabel: t('chatShare.actions.publish'),
      refreshLabel: t('chatShare.actions.refresh'),
      regenerateLabel: t('chatShare.actions.regenerate'),
      disableLabel: t('chatShare.actions.disable'),
      isPublishPending: dialog.pendingAction === CHAT_SHARE_ACTIONS.PUBLISH,
      isRefreshPending: dialog.pendingAction === CHAT_SHARE_ACTIONS.REFRESH,
      isRegeneratePending: dialog.pendingAction === CHAT_SHARE_ACTIONS.REGENERATE,
      isRevokePending: dialog.pendingAction === CHAT_SHARE_ACTIONS.REVOKE,
      onPublish: (): void => dialog.publish(dialog.allowIndexing),
      onRefresh: dialog.refresh,
      onRequestRegenerate: (): void => dialog.requestConfirm(ChatShareConfirmAction.REGENERATE),
      onRequestDisable: (): void => dialog.requestConfirm(ChatShareConfirmAction.DISABLE),
    },
  };
}
