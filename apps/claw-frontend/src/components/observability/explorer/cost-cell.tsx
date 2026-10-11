import type { ReactElement } from 'react';

import { CostKindBadge } from '@/components/observability/explorer/cost-kind-badge';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import type { CostCellProps } from '@/types/observability-explorer.types';
import { formatUsd } from '@/utilities/observability-explorer.utility';

/**
 * A cost with its honesty label. An unpriced or unmetered row shows only the
 * badge: printing "$0" there would claim the request was free when it was not
 * priced at all.
 */
export function CostCell({ cost, t }: CostCellProps): ReactElement {
  const showAmount =
    cost.costKind === UsageCostKind.Priced || cost.costKind === UsageCostKind.Fallback;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {showAmount ? <span className="tabular-nums">{formatUsd(cost.costMicroUsd)}</span> : null}
      <CostKindBadge kind={cost.costKind} partial={cost.partial === true} t={t} />
    </span>
  );
}
