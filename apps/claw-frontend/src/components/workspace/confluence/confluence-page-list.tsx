import { FileText } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { ConfluencePageListProps } from '@/types/component.types';
import { extractConfluenceMetadata } from '@/utilities/confluence.utility';

import { ConfluencePageRow } from './confluence-page-row';

export function ConfluencePageList({
  pages,
  isLoading,
  isError,
  onSelectPage,
  t,
}: ConfluencePageListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('confluence.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('confluence.page.error_title')}</p>;
  }

  if (pages.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('confluence.page.empty_title')}
        description={t('confluence.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {pages.map((page) => {
        const meta = extractConfluenceMetadata(page.metadata);
        return (
          <ConfluencePageRow
            key={page.id}
            page={page}
            metadata={meta}
            onClick={() => onSelectPage(page)}
            t={t}
          />
        );
      })}
    </div>
  );
}
