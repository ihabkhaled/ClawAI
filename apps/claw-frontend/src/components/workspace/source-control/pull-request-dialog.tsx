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
import type { PullRequestDialogProps } from '@/types/component.types';
import { extractPrMetadata } from '@/utilities/source-control.utility';

import { SourceControlActionsBar } from './source-control-actions-bar';

export function PullRequestDialog({
  pr,
  open,
  onClose,
  onOpenAiAction,
  t,
}: PullRequestDialogProps): React.ReactElement {
  const metadata = pr !== null ? extractPrMetadata(pr.metadata) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {pr !== null && metadata !== null ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">
                {metadata.number !== null ? `#${String(metadata.number)} ` : ''}
                {pr.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {metadata.author.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('source_control.pr.author')}: {metadata.author}
                    </span>
                  )}
                  {metadata.sourceBranch.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('source_control.pr.source_branch')}: <code>{metadata.sourceBranch}</code> →{' '}
                      <code>{metadata.targetBranch}</code>
                    </span>
                  )}
                  {metadata.additions !== null && (
                    <span className="text-green-600">+{metadata.additions}</span>
                  )}
                  {metadata.deletions !== null && (
                    <span className="text-destructive">-{metadata.deletions}</span>
                  )}
                  {metadata.isDraft && (
                    <Badge variant="secondary" className="text-xs">
                      {t('source_control.pr.draft')}
                    </Badge>
                  )}
                  {metadata.reviewers.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('source_control.pr.reviewers')}: {metadata.reviewers.join(', ')}
                    </span>
                  )}
                  {metadata.labels.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('source_control.pr.labels')}: {metadata.labels.join(', ')}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            {pr.content !== null && pr.content.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                {pr.content}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <SourceControlActionsBar
                pr={pr}
                onAction={onOpenAiAction}
                isDraftPending={false}
                t={t}
              />
              {pr.url !== null && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={pr.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t('source_control.pr.open_pr')}
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
