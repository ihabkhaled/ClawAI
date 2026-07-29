'use client';

import { ChefHat, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRecipesPage } from '@/hooks/agent/use-recipes-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentRecipesPage(): ReactElement {
  const { t } = useTranslation();
  const { recipes, total, isLoading, isError, error, handleDelete, isDeleting } = useRecipesPage();

  if (isError) {
    return (
      <div>
        <PageHeader title={t('agent.recipes')} description={t('agent.recipesDesc')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive text-sm">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('agent.recipes')}
        description={t('agent.recipesDesc')}
        actions={<span className="text-muted-foreground text-xs">{total} total</span>}
      />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && recipes.length === 0 && (
        <EmptyState
          icon={ChefHat}
          title={t('agent.noRecipes')}
          description={t('agent.noRecipesDesc')}
        />
      )}

      {!isLoading && recipes.length > 0 && (
        <div className="flex flex-col gap-3">
          {recipes.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4 py-3">
                {r.isEnabled ? (
                  <ToggleRight className="size-4 text-green-500" />
                ) : (
                  <ToggleLeft className="text-muted-foreground size-4" />
                )}
                <div className="flex flex-1 flex-col gap-1 truncate">
                  <Link
                    href={`/agent/recipes/${r.id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {r.name}
                  </Link>
                  {r.description !== null && (
                    <p className="text-muted-foreground truncate text-xs">{r.description}</p>
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
                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(r.id)}
                  className="text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                >
                  <Trash2 className="size-3" />
                  {t('common.delete')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
