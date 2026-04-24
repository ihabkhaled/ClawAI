import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SlackMessageDialogProps } from '@/types/component.types';
import { extractSlackMetadata } from '@/utilities/slack.utility';

import { SlackActionsBar } from './slack-actions-bar';

export function SlackMessageDialog({
  message,
  open,
  onClose,
  onOpenAiAction,
  t,
}: SlackMessageDialogProps): React.ReactElement {
  const metadata = message !== null ? extractSlackMetadata(message.metadata) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {message !== null && metadata !== null ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">
                {metadata.channelName.length > 0 ? `#${metadata.channelName}` : message.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {metadata.senderName.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('slack.message.sender')}: {metadata.senderName}
                    </span>
                  )}
                  {message.externalCreatedAt !== null && (
                    <span className="text-muted-foreground">
                      {t('slack.message.date')}:{' '}
                      {new Date(message.externalCreatedAt).toLocaleString()}
                    </span>
                  )}
                  {metadata.isThreadReply && (
                    <Badge variant="outline" className="text-xs">
                      {t('slack.message.thread_reply')}
                    </Badge>
                  )}
                  {metadata.reactions.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('slack.message.reactions')}: {metadata.reactions.join(' ')}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
              {message.content !== null && message.content.length > 0
                ? message.content
                : message.title}
            </div>

            <div className="flex items-center justify-between gap-2">
              <SlackActionsBar
                message={message}
                onAction={onOpenAiAction}
                isDraftPending={false}
                t={t}
              />
              {message.url !== null && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={message.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t('slack.message.open_in_slack')}
                  </a>
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
