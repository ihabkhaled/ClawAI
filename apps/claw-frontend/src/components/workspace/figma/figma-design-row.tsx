import { Frame as Figma } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { FigmaDesignRowProps } from '@/types/component.types';

export function FigmaDesignRow({
  design,
  metadata,
  onClick,
  t,
}: FigmaDesignRowProps): React.ReactElement {
  const date =
    design.externalUpdatedAt !== null
      ? new Date(design.externalUpdatedAt).toLocaleDateString()
      : '';

  return (
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={onClick}
      className="border-border hover:bg-accent flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors"
    >
      {metadata.thumbnailUrl !== null ? (
        <img
          src={metadata.thumbnailUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="mt-0.5 size-8 shrink-0 rounded object-cover"
        />
      ) : (
        <Figma className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{design.title}</span>
          <span className="text-muted-foreground shrink-0 text-xs">{date}</span>
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          {metadata.teamName !== null && (
            <span>
              {t('figma.design.team')}: {metadata.teamName}
            </span>
          )}
          {metadata.projectName !== null && (
            <span>
              {t('figma.design.project')}: {metadata.projectName}
            </span>
          )}
          {metadata.componentCount !== null && (
            <span>
              {metadata.componentCount} {t('figma.design.components')}
            </span>
          )}
        </div>
      </div>
    </Button>
  );
}
