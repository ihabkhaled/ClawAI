import { Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MODEL_CATEGORY_LABELS,
  MODEL_RUNTIME_BADGE_CLASSES,
  MODEL_RUNTIME_LABELS,
} from '@/constants';
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
  const runtimeLabel = MODEL_RUNTIME_LABELS[entry.runtime] ?? entry.runtime;
  const runtimeClass =
    MODEL_RUNTIME_BADGE_CLASSES[entry.runtime] ?? 'bg-muted text-muted-foreground';

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
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary" className="text-xs">
              {MODEL_CATEGORY_LABELS[entry.category] ?? entry.category}
            </Badge>
            <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium', runtimeClass)}>
              {runtimeLabel}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {entry.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{entry.description}</p>
        ) : null}

        {entry.sourceUrl ? (
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-primary underline-offset-4 hover:underline"
          >
            {entry.sourceUrl}
          </a>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {entry.parameterCount ? (
            <span>
              <span className="font-medium text-foreground">{t('catalog.parameterCount')}:</span>{' '}
              {entry.parameterCount}
            </span>
          ) : null}
          {entry.sizeBytes ? (
            <span>
              <span className="font-medium text-foreground">{t('catalog.modelSize')}:</span>{' '}
              {formatBytes(entry.sizeBytes)}
            </span>
          ) : null}
        </div>

        {entry.capabilities.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {entry.capabilities.map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs capitalize">
                {cap.replaceAll('_', ' ')}
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
