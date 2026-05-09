'use client';

import { ChefHat, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRecipesPage } from '@/hooks/agent/use-recipes-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentRecipesPage(): ReactElement {
  const { t } = useTranslation();
  const { recipes, total, isLoading, isError, error, handleDelete, isDeleting } = useRecipesPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.recipes')} description={t('agent.recipesDesc')} />
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
      <PageHeader
        title={t('agent.recipes')}
        description={t('agent.recipesDesc')}
        actions={<span className="text-xs text-muted-foreground">{total} total</span>}
      />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && recipes.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={ChefHat}
            title={t('agent.noRecipes')}
            description={t('agent.noRecipesDesc')}
          />
        </div>
      )}

      {!isLoading && recipes.length > 0 && (
        <div className="flex flex-col gap-3">
          {recipes.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4 py-3">
                {r.isEnabled ? (
                  <ToggleRight className="size-4 text-green-500" />
                ) : (
                  <ToggleLeft className="size-4 text-muted-foreground" />
                )}
                <div className="flex flex-1 flex-col gap-1 truncate">
                  <Link href={`/agent/recipes/${r.id}`} className="text-sm font-semibold hover:underline">
                    {r.name}
                  </Link>
                  {r.description !== null && (
                    <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      v{r.version}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {r.dsl.steps.length} steps
                    </Badge>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(r.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3" />
                  {t('common.delete')}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
