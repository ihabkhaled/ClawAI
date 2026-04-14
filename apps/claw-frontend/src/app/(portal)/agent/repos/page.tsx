'use client';

import { GitBranch, GitCommit } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentReposPage } from '@/hooks/agent/use-agent-repos-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentReposPage(): React.ReactElement {
  const { t } = useTranslation();
  const { repos, total, isLoading, isError, error } = useAgentReposPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.repos')} description={t('agent.reposDesc')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('agent.repos')} description={`${total} ${t('agent.reposDesc')}`} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && repos.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={GitBranch}
            title={t('agent.noRepos')}
            description={t('agent.noReposDesc')}
          />
        </div>
      )}

      {!isLoading && repos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <Card key={repo.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{repo.name}</span>
                  {repo.isDirty && (
                    <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                      {t('agent.dirty')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-xs text-muted-foreground">
                <p className="truncate">{repo.repoPath}</p>
                {repo.branch !== null && (
                  <p className="flex items-center gap-1">
                    <GitBranch className="size-3" />
                    {repo.branch}
                  </p>
                )}
                {repo.commitHash !== null && (
                  <p className="flex items-center gap-1">
                    <GitCommit className="size-3" />
                    {repo.commitHash.slice(0, 7)}
                  </p>
                )}
                <p>
                  {repo.fileCount} {t('agent.files')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
