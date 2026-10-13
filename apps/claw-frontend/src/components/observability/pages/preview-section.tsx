import Link from 'next/link';
import type { ReactElement } from 'react';

import { QueryState } from '@/components/observability/explorer/query-state';
import { EntityTable } from '@/components/observability/pages/entity-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useObservabilityPreview } from '@/hooks/observability/use-observability-preview';
import type { PreviewSectionProps } from '@/types/observability-pages.types';
import { viewAllText } from '@/utilities/observability-pages.utility';

/**
 * The first rows of one full list. The size is the operator's choice and the
 * link carries the real total, so the preview never passes for the whole list.
 */
export function PreviewSection({
  kind,
  title,
  top,
  viewAllHref,
  viewAllLabel,
  onOpenUser,
  sharedQuery,
  t,
}: PreviewSectionProps): ReactElement {
  const preview = useObservabilityPreview(kind, top);
  const rows = preview.rows ?? [];

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link
          href={viewAllHref}
          className="text-primary focus-visible:ring-ring rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {viewAllText(viewAllLabel, preview.total)}
        </Link>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={preview.isLoading}
          isError={preview.isError}
          isEmpty={preview.rows !== null && rows.length === 0}
          onRetry={preview.refetch}
          t={t}
        >
          <EntityTable
            kind={kind}
            rows={rows}
            sort=""
            order="desc"
            compact
            onOpenUser={onOpenUser}
            sharedQuery={sharedQuery}
            t={t}
          />
        </QueryState>
      </CardContent>
    </Card>
  );
}
