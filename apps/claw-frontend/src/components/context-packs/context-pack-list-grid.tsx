import { BookOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContextPackListGridProps } from '@/types';
import { formatTimeAgo } from '@/utilities';

export function ContextPackListGrid({
  packs,
  onSelectPack,
}: ContextPackListGridProps): React.ReactElement {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packs.map((pack) => (
        <Card
          key={pack.id}
          className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          onClick={() => onSelectPack(pack.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectPack(pack.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={pack.name}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{pack.name}</CardTitle>
                {pack.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{pack.description}</p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {pack.scope ? (
                <Badge variant="outline" className="text-xs">
                  {pack.scope}
                </Badge>
              ) : (
                <span />
              )}
              <span title={pack.updatedAt}>{formatTimeAgo(pack.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
