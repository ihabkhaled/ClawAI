import { FileText } from 'lucide-react';

import type { DocFileRowProps } from '@/types/component.types';
import { formatFileSize, resolveDocDate } from '@/utilities/docs.utility';

export function DocFileRow({ doc, metadata, onClick, t }: DocFileRowProps): React.ReactElement {
  const date = resolveDocDate(doc.externalUpdatedAt, doc.externalCreatedAt);

  const sizeLabel = formatFileSize(metadata.fileSize);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent"
    >
      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{doc.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
    </button>
  );
}
