import type { ReactElement } from 'react';

import { KpiDeltaLine } from '@/components/observability/pages/kpi-delta-line';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { KpiCardProps } from '@/types/observability-pages.types';

/** A headline number with its change against the previous period. */
export function KpiCard({ title, value, delta, t }: KpiCardProps): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <KpiDeltaLine delta={delta} t={t} />
      </CardContent>
    </Card>
  );
}
