'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import type { ModelBillingHelpProps } from '@/types/model-billing.types';

/** What "Credit" means, and where an admin changes it. */
export function ModelBillingHelp({ isPolicyError, t }: ModelBillingHelpProps): ReactElement {
  return (
    <div
      className="bg-surface-panel text-muted-foreground flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-start sm:justify-between"
      data-testid="model-billing-help"
    >
      <div className="flex min-w-0 items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="max-w-prose">{t('adminModelCosts.billing.help')}</p>
          {isPolicyError ? (
            <p className="text-destructive" role="alert">
              {t('adminModelCosts.billing.policyError')}
            </p>
          ) : null}
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="touch:min-h-11 shrink-0">
        <Link href={ROUTES.CONNECTORS}>{t('adminModelCosts.billing.connectorsLink')}</Link>
      </Button>
    </div>
  );
}
