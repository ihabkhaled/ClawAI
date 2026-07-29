import { FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConfluencePageRowProps } from '@/types/component.types';
import { resolveSpaceLabel } from '@/utilities/confluence.utility';

export function ConfluencePageRow({
  page,
  metadata,
  onClick,
  t,
}: ConfluencePageRowProps): React.ReactElement {
  const date =
    page.externalUpdatedAt !== null ? new Date(page.externalUpdatedAt).toLocaleDateString() : '';

  const spaceLabel = resolveSpaceLabel(metadata.spaceKey, metadata.spaceName);

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
          <span className="truncate text-sm font-medium">{page.title}</span>
          <span className="text-muted-foreground shrink-0 text-xs">{date}</span>
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          {spaceLabel !== null && (
            <span>
              {t('confluence.article.space')}: {spaceLabel}
            </span>
          )}
          {metadata.author !== null && (
            <span>
              {t('confluence.article.author')}: {metadata.author}
            </span>
          )}
        </div>
        {metadata.labels.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {metadata.labels.slice(0, 3).map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Button>
  );
}
