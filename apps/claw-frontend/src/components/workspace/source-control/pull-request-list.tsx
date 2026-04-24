import { GitPullRequest } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { PullRequestListProps } from '@/types/component.types';
import { extractPrMetadata } from '@/utilities/source-control.utility';

import { PullRequestRow } from './pull-request-row';

export function PullRequestList({
  pullRequests,
  isLoading,
  isError,
  onSelectPr,
  t,
}: PullRequestListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('source_control.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('source_control.page.error_title')}</p>;
  }

  if (pullRequests.length === 0) {
    return (
      <EmptyState
        icon={GitPullRequest}
        title={t('source_control.page.empty_title')}
        description={t('source_control.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {pullRequests.map((pr) => {
        const meta = extractPrMetadata(pr.metadata);
        return (
          <PullRequestRow
            key={pr.id}
            pr={pr}
            metadata={meta}
            onClick={() => onSelectPr(pr)}
            t={t}
          />
        );
      })}
    </div>
  );
}
