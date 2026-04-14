'use client';

import { PageHeader } from '@/components/common/page-header';
import { Input } from '@/components/ui/input';
import { WorkspaceSearchResults } from '@/components/workspace/workspace-search-results';
import { useWorkspaceSearchPage } from '@/hooks/workspace/use-workspace-search-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceSearchPage(): React.ReactElement {
  const { t } = useTranslation();
  const { query, setQuery, results, isLoading, isError } = useWorkspaceSearchPage();

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={t('workspaceSearch.title')}
        description={t('workspaceSearch.description')}
      />
      <Input
        placeholder={t('workspaceSearch.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-lg"
      />
      <WorkspaceSearchResults
        results={results}
        isLoading={isLoading}
        isError={isError}
        query={query}
        t={t}
      />
    </div>
  );
}
