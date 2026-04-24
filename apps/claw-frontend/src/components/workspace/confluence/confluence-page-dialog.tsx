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
import type { ConfluencePageDialogProps } from '@/types/component.types';
import { extractConfluenceMetadata } from '@/utilities/confluence.utility';

import { ConfluenceActionsBar } from './confluence-actions-bar';

export function ConfluencePageDialog({
  page,
  open,
  onClose,
  onOpenAiAction,
  t,
}: ConfluencePageDialogProps): React.ReactElement {
  const metadata = page !== null ? extractConfluenceMetadata(page.metadata) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {page !== null && metadata !== null ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">{page.title}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {metadata.spaceName.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('confluence.article.space')}: {metadata.spaceName}
                    </span>
                  )}
                  {metadata.author !== null && (
                    <span className="text-muted-foreground">
                      {t('confluence.article.author')}: {metadata.author}
                    </span>
                  )}
                  {metadata.lastModifiedBy !== null && (
                    <span className="text-muted-foreground">
                      {t('confluence.article.modified_by')}: {metadata.lastModifiedBy}
                    </span>
                  )}
                  {metadata.version !== null && (
                    <span className="text-muted-foreground">
                      {t('confluence.article.version')}: v{metadata.version}
                    </span>
                  )}
                  {metadata.parentTitle !== null && (
                    <span className="text-muted-foreground">
                      {t('confluence.article.parent')}: {metadata.parentTitle}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            {metadata.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {metadata.labels.map((label) => (
                  <Badge key={label} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}

            {page.content !== null && page.content.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                {page.content}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <ConfluenceActionsBar
                page={page}
                onAction={onOpenAiAction}
                isDraftPending={false}
                t={t}
              />
              {metadata.webUrl !== null && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={metadata.webUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t('confluence.article.open_page')}
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
