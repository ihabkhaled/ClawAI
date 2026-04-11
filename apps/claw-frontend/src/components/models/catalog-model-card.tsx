import { Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MODEL_CATEGORY_LABELS } from '@/constants';
import { cn } from '@/lib/utils';
import type { CatalogModelCardProps } from '@/types';
import { formatBytes } from '@/utilities';

import { CatalogModelAction } from './catalog-model-action';

export function CatalogModelCard({
  entry,
  job,
  onPull,
  onDelete,
  isPullPending,
  isDeletePending,
  t,
}: CatalogModelCardProps) {
  return (
    <Card className={cn('flex flex-col', entry.isRecommended && 'border-primary/50')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="truncate">{entry.displayName}</span>
              {entry.isRecommended ? (
                <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />
              ) : null}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {entry.name}:{entry.tag}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {MODEL_CATEGORY_LABELS[entry.category] ?? entry.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {entry.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{entry.description}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {entry.parameterCount ? (
            <span>
              {t('catalog.parameterCount')}: {entry.parameterCount}
            </span>
          ) : null}
          {entry.sizeBytes ? (
            <span>
              {t('catalog.modelSize')}: {formatBytes(entry.sizeBytes)}
            </span>
          ) : null}
        </div>

        {entry.capabilities.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {entry.capabilities.map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto pt-2">
          <CatalogModelAction
            entry={entry}
            job={job}
            onPull={onPull}
            onDelete={onDelete}
            isPullPending={isPullPending}
            isDeletePending={isDeletePending}
            t={t}
          />
        </div>
      </CardContent>
    </Card>
  );
}
