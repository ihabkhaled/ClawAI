import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FigmaDesignDialogProps } from '@/types/component.types';
import { extractFigmaMetadata } from '@/utilities/figma.utility';

import { FigmaActionsBar } from './figma-actions-bar';

export function FigmaDesignDialog({
  design,
  open,
  onClose,
  onOpenAiAction,
  t,
}: FigmaDesignDialogProps): React.ReactElement {
  const metadata = design !== null ? extractFigmaMetadata(design.metadata) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {design !== null && metadata !== null ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">{design.title}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {metadata.teamName !== null && (
                    <span className="text-muted-foreground">
                      {t('figma.design.team')}: {metadata.teamName}
                    </span>
                  )}
                  {metadata.projectName !== null && (
                    <span className="text-muted-foreground">
                      {t('figma.design.project')}: {metadata.projectName}
                    </span>
                  )}
                  {metadata.lastModifiedBy !== null && (
                    <span className="text-muted-foreground">
                      {t('figma.design.modified_by')}: {metadata.lastModifiedBy}
                    </span>
                  )}
                  {metadata.componentCount !== null && (
                    <span className="text-muted-foreground">
                      {metadata.componentCount} {t('figma.design.components')}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            {metadata.thumbnailUrl !== null && (
              <div className="overflow-hidden rounded-md border border-border">
                <img
                  src={metadata.thumbnailUrl}
                  alt={design.title}
                  className="w-full object-cover"
                />
              </div>
            )}

            {design.content !== null && design.content.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                {design.content}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <FigmaActionsBar
                design={design}
                onAction={onOpenAiAction}
                isDraftPending={false}
                t={t}
              />
              {metadata.webUrl !== null && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={metadata.webUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t('figma.design.open_in_figma')}
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
