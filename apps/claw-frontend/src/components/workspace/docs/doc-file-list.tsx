import { FileText } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { DocFileListProps } from '@/types/component.types';
import { extractDocMetadata } from '@/utilities/docs.utility';

import { DocFileRow } from './doc-file-row';

export function DocFileList({
  docs,
  isLoading,
  isError,
  onSelectDoc,
  t,
}: DocFileListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('docs.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('docs.page.error_title')}</p>;
  }

  if (docs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('docs.page.empty_title')}
        description={t('docs.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {docs.map((doc) => {
        const meta = extractDocMetadata(doc.metadata);
        return (
          <DocFileRow
            key={doc.id}
            doc={doc}
            metadata={meta}
            onClick={() => onSelectDoc(doc)}
            t={t}
          />
        );
      })}
    </div>
  );
}
