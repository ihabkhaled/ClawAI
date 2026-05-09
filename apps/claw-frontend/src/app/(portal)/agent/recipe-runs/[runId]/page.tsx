'use client';

import { ArrowLeft, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRecipeRunDetailPage } from '@/hooks/agent/use-recipe-run-detail-page';
import { useTranslation } from '@/lib/i18n';
import { resolveStepBadgeVariant } from '@/utilities/recipe-step-badge.utility';

export default function RecipeRunDetailPage(): ReactElement {
  const { t } = useTranslation();
  const params = useParams<{ runId: string }>();
  const runId = typeof params.runId === 'string' ? params.runId : null;
  const { run, isLoading, isError, error, handleCancel, isCancelling } =
    useRecipeRunDetailPage(runId);

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.recipeRunDetail')} description={t('agent.recipeRunDetailDesc')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || run === undefined) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.recipeRunDetail')} description={t('agent.recipeRunDetailDesc')} />
        <LoadingSpinner label={t('agent.loading')} />
      </div>
    );
  }

  const isTerminal = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(run.status);

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={t('agent.recipeRunDetail')}
        description={`${t('agent.runStatus')}: ${run.status}`}
        actions={
          <Link
            href="/agent/recipes"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            {t('common.back')}
          </Link>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-3 py-3">
          <Badge variant={run.status === 'SUCCEEDED' ? 'default' : 'destructive'}>{run.status}</Badge>
          <span className="text-xs text-muted-foreground">id={run.id}</span>
          {!isTerminal && (
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleCancel}
              className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              <XCircle className="size-3" />
              {t('agent.cancelRun')}
            </button>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t('agent.steps')} ({run.steps.length})</h2>
        {run.steps.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center gap-3 py-2">
              <Badge
                variant={resolveStepBadgeVariant(s.status)}
                className="shrink-0 text-xs"
              >
                {s.status}
              </Badge>
              <span className="font-mono text-xs">
                #{s.stepIndex} {s.stepId}
              </span>
              {s.invocationId !== null && (
                <code className="flex-1 truncate text-xs text-muted-foreground">
                  inv {s.invocationId}
                </code>
              )}
              {s.errorMessage !== null && (
                <span className="text-xs text-destructive">{s.errorMessage}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
