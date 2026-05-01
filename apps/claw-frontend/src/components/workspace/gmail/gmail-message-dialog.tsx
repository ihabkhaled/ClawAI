'use client';

import { ExternalLink, ImageIcon, Type } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useGmailMessageView } from '@/hooks/workspace/gmail/use-gmail-message-view';
import type { GmailMessageDialogProps } from '@/types/component.types';
import {
  clientStripImages,
  extractGmailMetadata,
  extractGmailRichMetadata,
} from '@/utilities/gmail.utility';

import { GmailActionsBar } from './gmail-actions-bar';
import { GmailAttachmentList } from './gmail-attachment-list';

export function GmailMessageDialog({
  message,
  open,
  onClose,
  onOpenAiAction,
  t,
}: GmailMessageDialogProps): React.ReactElement {
  const metadata = message !== null ? extractGmailMetadata(message.metadata) : null;
  const rich = message !== null ? extractGmailRichMetadata(message.metadata) : null;
  const view = useGmailMessageView({ hasHtml: rich?.renderedHtml !== null && rich?.renderedHtml !== undefined });

  const renderBody = (): React.ReactElement => {
    if (rich?.renderedHtml !== null && rich?.renderedHtml !== undefined && view.showHtml) {
      const html = view.loadImages ? rich.renderedHtml : clientStripImages(rich.renderedHtml);
      return (
        <iframe
          srcDoc={html}
          sandbox="allow-same-origin"
          className="h-[60vh] w-full rounded-md border border-border bg-white"
          title={t('gmail.message.htmlIframeTitle')}
        />
      );
    }
    const plainText =
      (rich?.renderedText !== null && rich?.renderedText !== undefined ? rich.renderedText : null) ??
      (message?.content !== null && message?.content !== undefined ? message.content : null) ??
      metadata?.snippet ??
      '';
    return (
      <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {plainText}
      </pre>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {message !== null && metadata !== null && rich !== null ? (
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

            {rich.renderedHtml !== null ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 p-2 text-xs">
                <label className="flex items-center gap-2">
                  <Type className="size-3.5" aria-hidden />
                  <Switch
                    checked={view.showHtml}
                    onCheckedChange={view.setShowHtml}
                    aria-label={t('gmail.message.toggleHtml')}
                  />
                  <span>{t('gmail.message.showHtml')}</span>
                </label>
                {view.showHtml ? (
                  <label className="flex items-center gap-2">
                    <ImageIcon className="size-3.5" aria-hidden />
                    <Switch
                      checked={view.loadImages}
                      onCheckedChange={view.setLoadImages}
                      aria-label={t('gmail.message.toggleImages')}
                    />
                    <span>{t('gmail.message.loadImages')}</span>
                  </label>
                ) : null}
                {!view.loadImages && view.showHtml ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t('gmail.message.imagesBlocked')}
                  </span>
                ) : null}
              </div>
            ) : null}

            {renderBody()}

            <GmailAttachmentList attachments={rich.attachmentRefs} t={t} />

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
