import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { DocFileRowProps } from '@/types/component.types';
import { formatFileSize, resolveDocDate } from '@/utilities/docs.utility';

export function DocFileRow({ doc, metadata, onClick, t }: DocFileRowProps): React.ReactElement {
  const date = resolveDocDate(doc.externalUpdatedAt, doc.externalCreatedAt);

  const sizeLabel = formatFileSize(metadata.fileSize);

  return (
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={onClick}
      className="border-border hover:bg-accent flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors"
    >
      <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{doc.title}</span>
          <span className="text-muted-foreground shrink-0 text-xs">{date}</span>
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          {metadata.owner !== null && (
            <span>
              {t('docs.file.owner')}: {metadata.owner}
            </span>
          )}
          {sizeLabel.length > 0 && (
            <span>
              {t('docs.file.size')}: {sizeLabel}
            </span>
          )}
          {metadata.parentPath !== null && (
            <span className="truncate">
              {t('docs.file.path')}: {metadata.parentPath}
            </span>
          )}
        </div>
      </div>
    </Button>
  );
}
