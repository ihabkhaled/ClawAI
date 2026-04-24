import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GmailMessageDialogProps } from '@/types/component.types';
import { extractGmailMetadata } from '@/utilities/gmail.utility';

import { GmailActionsBar } from './gmail-actions-bar';

export function GmailMessageDialog({
  message,
  open,
  onClose,
  onOpenAiAction,
  t,
}: GmailMessageDialogProps): React.ReactElement {
  const metadata = message !== null ? extractGmailMetadata(message.metadata) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {message !== null && metadata !== null ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">
                {metadata.subject || message.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium text-foreground">{t('gmail.message.from')}:</span>{' '}
                    {metadata.from}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">{t('gmail.message.to')}:</span>{' '}
                    {metadata.to}
                  </p>
                  {message.externalCreatedAt !== null && (
                    <p>
                      <span className="font-medium text-foreground">
                        {t('gmail.message.date')}:
                      </span>{' '}
                      {new Date(message.externalCreatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
              {message.content !== null && message.content.length > 0
                ? message.content
                : metadata.snippet}
            </div>

            <div className="flex items-center justify-between gap-2">
              <GmailActionsBar
                message={message}
                onAction={onOpenAiAction}
                isDraftPending={false}
                t={t}
              />
              {message.url !== null && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={message.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t('gmail.message.open_in_gmail')}
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
