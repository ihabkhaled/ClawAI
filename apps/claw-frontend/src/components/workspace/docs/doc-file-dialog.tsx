import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DocFileDialogProps } from '@/types/component.types';
import { extractDocMetadata, formatFileSize } from '@/utilities/docs.utility';

import { DocsActionsBar } from './docs-actions-bar';

export function DocFileDialog({
  doc,
  open,
  onClose,
  onOpenAiAction,
  t,
}: DocFileDialogProps): React.ReactElement {
  const metadata = doc !== null ? extractDocMetadata(doc.metadata) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {doc !== null && metadata !== null ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">{doc.title}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {metadata.owner !== null && (
                    <span className="text-muted-foreground">
                      {t('docs.file.owner')}: {metadata.owner}
                    </span>
                  )}
                  {metadata.lastModifiedBy !== null && (
                    <span className="text-muted-foreground">
                      {t('docs.file.modified_by')}: {metadata.lastModifiedBy}
                    </span>
                  )}
                  {metadata.fileSize !== null && (
                    <span className="text-muted-foreground">
                      {t('docs.file.size')}: {formatFileSize(metadata.fileSize)}
                    </span>
                  )}
                  {metadata.mimeType.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('docs.file.type')}: {metadata.mimeType}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            {doc.content !== null && doc.content.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                {doc.content}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <DocsActionsBar doc={doc} onAction={onOpenAiAction} isDraftPending={false} t={t} />
              {metadata.webUrl !== null && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={metadata.webUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t('docs.file.open_file')}
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
