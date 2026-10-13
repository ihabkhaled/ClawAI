import Link from 'next/link';
import type { ReactElement } from 'react';

import { CostCell } from '@/components/observability/explorer/cost-cell';
import { Button } from '@/components/ui/button';
import { ENTITY_LINK_CLASS, NO_PLAN_FILTER } from '@/constants/observability-pages.constants';
import type { EntityCellProps } from '@/types/observability-pages.types';
import {
  formatCount,
  formatTimestamp,
  formatUsd,
  totalTokens,
} from '@/utilities/observability-explorer.utility';
import {
  entityName,
  formatPercent,
  formatRatioPercent,
  formatSettle,
  modelDetailHref,
  providerDetailHref,
  roleLabel,
  rowProviderKey,
  statusLabel,
  toCostKind,
  usersHref,
} from '@/utilities/observability-pages.utility';

/** One table cell of a list row; the column id decides what it shows. */
export function EntityCell({
  column,
  row,
  onOpenUser,
  sharedQuery,
  t,
}: EntityCellProps): ReactElement {
  const { metrics, derived, health } = row;
  const name = entityName(row, t);
  switch (column.id) {
    case 'name':
      if (row.kind === 'USER' && row.userId !== null) {
        const userId = row.userId;
        return (
          <div className="min-w-56">
            <Button
              type="button"
              variant="link"
              className="h-auto max-w-full justify-start p-0 text-start break-all whitespace-normal"
              aria-label={t('observabilityExplorer.openUser', { user: name })}
              onClick={() => {
                onOpenUser(userId);
              }}
            >
              {name}
            </Button>
            {row.username === null || row.username === name ? null : (
              <span className="text-muted-foreground block text-xs break-all">{row.username}</span>
            )}
          </div>
        );
      }
      if (row.kind === 'PROVIDER') {
        return (
          <Link
            href={providerDetailHref(rowProviderKey(row), sharedQuery)}
            className={ENTITY_LINK_CLASS}
          >
            {name}
          </Link>
        );
      }
      if (row.kind === 'MODEL' && row.model !== null) {
        return (
          <Link
            href={modelDetailHref(rowProviderKey(row), row.model, sharedQuery)}
            className={ENTITY_LINK_CLASS}
          >
            {name}
          </Link>
        );
      }
      if (row.kind === 'PLAN') {
        return (
          <Link
            href={usersHref(sharedQuery, { plan: row.planId ?? NO_PLAN_FILTER })}
            className={ENTITY_LINK_CLASS}
            aria-label={t('observabilityPages.openUsersOf', { name })}
          >
            {name}
          </Link>
        );
      }
      if (row.kind === 'WORKFLOW') {
        return (
          <Link
            href={usersHref(sharedQuery, { workflow: row.key })}
            className={ENTITY_LINK_CLASS}
            aria-label={t('observabilityPages.openUsersOf', { name })}
          >
            {name}
          </Link>
        );
      }
      return <span className="font-medium break-all">{name}</span>;
    case 'provider':
      return <span>{row.providerLabel ?? '-'}</span>;
    case 'role':
      return <>{roleLabel(row.role, t)}</>;
    case 'status':
      return <>{statusLabel(row.status, t)}</>;
    case 'plan':
      return <>{row.planName ?? t('observabilityPages.noPlan')}</>;
    case 'signedUp':
      return <span className="whitespace-nowrap">{formatTimestamp(row.signedUpAt)}</span>;
    case 'requests':
      return <>{formatCount(metrics.requests)}</>;
    case 'tokens':
      return <>{formatCount(totalTokens(metrics))}</>;
    case 'inputTokens':
      return <>{formatCount(metrics.inputTokens)}</>;
    case 'outputTokens':
      return <>{formatCount(metrics.outputTokens)}</>;
    case 'cachedTokens':
      return <>{formatCount(metrics.cachedTokens)}</>;
    case 'toolCalls':
      return <>{formatCount(metrics.toolCalls)}</>;
    case 'cost':
      return (
        <CostCell
          cost={{
            costMicroUsd: metrics.cost.costMicroUsd,
            costKind: toCostKind(metrics.cost.costKind),
            partial: metrics.cost.partial,
          }}
          t={t}
        />
      );
    case 'costPerRequest':
      return (
        <>
          {derived.costPerRequestMicroUsd === null
            ? '-'
            : formatUsd(derived.costPerRequestMicroUsd)}
        </>
      );
    case 'shareOfCost':
      return <>{formatPercent(derived.shareOfCostPct)}</>;
    case 'distinctUsers':
      return <>{metrics.distinctUsers === null ? '-' : formatCount(metrics.distinctUsers)}</>;
    case 'distinctModels':
      return <>{metrics.distinctModels === null ? '-' : formatCount(metrics.distinctModels)}</>;
    case 'billing':
      return (
        <>
          {t('observabilityPages.billingSplitCell', {
            credit: formatCount(metrics.creditRequests),
            allowance: formatCount(metrics.allowanceRequests),
          })}
        </>
      );
    case 'allowanceCost':
      return <>{formatUsd(metrics.allowanceCostMicroUsd)}</>;
    case 'cacheHitRate':
      return <>{formatRatioPercent(derived.cacheHitRate)}</>;
    case 'settleRate':
      return <>{formatRatioPercent(health?.settleRate ?? null)}</>;
    case 'refundRate':
      return <>{formatRatioPercent(health?.refundRate ?? null)}</>;
    case 'settleP95':
      return <>{formatSettle(health?.p95SettleMs ?? null)}</>;
    case 'activeDays':
      return <>{formatCount(metrics.activeDays)}</>;
    case 'firstSeen':
      return <span className="whitespace-nowrap">{formatTimestamp(metrics.firstSeenAt)}</span>;
    case 'lastSeen':
      return <span className="whitespace-nowrap">{formatTimestamp(metrics.lastSeenAt)}</span>;
  }
}
