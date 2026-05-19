import { Frame as Figma } from 'lucide-react';

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
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent"
    >
      {metadata.thumbnailUrl !== null ? (
        <img
          src={metadata.thumbnailUrl}
          alt=""
          aria-hidden="true"
          className="mt-0.5 size-8 shrink-0 rounded object-cover"
        />
      ) : (
        <Figma className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{design.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
    </button>
  );
}
