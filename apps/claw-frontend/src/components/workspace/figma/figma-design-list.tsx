import { Figma } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { FigmaDesignListProps } from '@/types/component.types';
import { extractFigmaMetadata } from '@/utilities/figma.utility';

import { FigmaDesignRow } from './figma-design-row';

export function FigmaDesignList({
  designs,
  isLoading,
  isError,
  onSelect,
  t,
}: FigmaDesignListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('figma.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('figma.page.error_title')}</p>;
  }

  if (designs.length === 0) {
    return (
      <EmptyState
        icon={Figma}
        title={t('figma.page.empty_title')}
        description={t('figma.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {designs.map((design) => {
        const meta = extractFigmaMetadata(design.metadata);
        return (
          <FigmaDesignRow
            key={design.id}
            design={design}
            metadata={meta}
            onClick={() => onSelect(design)}
            t={t}
          />
        );
      })}
    </div>
  );
}
