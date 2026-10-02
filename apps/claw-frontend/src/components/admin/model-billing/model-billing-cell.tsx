'use client';

import { Settings2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { ModelBillingBadge } from '@/components/admin/model-billing/model-billing-badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import type { ModelBillingCellProps } from '@/types/model-billing.types';

/** The billing badge plus a link to the connector whose switch decides it. */
export function ModelBillingCell({ billing, provider, t }: ModelBillingCellProps): ReactElement {
  const href =
    billing.connectorId === null ? ROUTES.CONNECTORS : ROUTES.CONNECTOR_DETAIL(billing.connectorId);
  const label = t('adminModelCosts.billing.editConnectorFor', { provider });
  return (
    <div className="touch:justify-end flex flex-wrap items-center justify-start gap-1">
      <ModelBillingBadge billing={billing} t={t} />
      <Button
        asChild
        size="icon"
        variant="ghost"
        className="touch:h-11 touch:w-11 h-8 w-8"
        title={label}
      >
        <Link href={href} aria-label={label}>
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
