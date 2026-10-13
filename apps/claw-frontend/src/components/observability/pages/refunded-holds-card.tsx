import type { ReactElement } from 'react';

import { HealthCard } from '@/components/observability/pages/health-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RefundedHoldsCardProps } from '@/types/observability-pages.types';
import { formatCount } from '@/utilities/observability-explorer.utility';
import { formatRatioPercent } from '@/utilities/observability-pages.utility';

/**
 * Holds released before billing, from the billing ledger: overall, then the
 * providers that refunded the most. It is the money-side counterpart of the audit
 * failures below, and says plainly that these are not HTTP errors.
 */
export function RefundedHoldsCard({ report, t }: RefundedHoldsCardProps): ReactElement {
  return (
    <div className="space-y-4" data-testid="refunded-holds">
      <HealthCard health={report.overall} t={t} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('observabilityPages.refundsTitle')}</CardTitle>
          <CardDescription>{t('observabilityPages.refundsNote')}</CardDescription>
        </CardHeader>
        <CardContent>
          {report.byProvider.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('observabilityPages.refundsEmpty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('observabilityExplorer.colProvider')}</TableHead>
                    <TableHead className="text-end">
                      {t('observabilityPages.colReleased')}
                    </TableHead>
                    <TableHead className="text-end">
                      {t('observabilityPages.colRefundRate')}
                    </TableHead>
                    <TableHead className="text-end">{t('observabilityPages.colStale')}</TableHead>
                    <TableHead className="text-end">
                      {t('observabilityPages.colSettleRate')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byProvider.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-medium break-all">{entry.label}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatCount(entry.health.released)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatRatioPercent(entry.health.refundRate)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatCount(entry.health.staleReserved)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatRatioPercent(entry.health.settleRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
