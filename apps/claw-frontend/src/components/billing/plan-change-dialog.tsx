import type { ReactElement } from 'react';

import { GatewaySelect } from '@/components/billing/gateway-select';
import { ProrationBreakdown } from '@/components/billing/proration-breakdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanChangeDialogProps } from '@/types/billing-component.types';

export function PlanChangeDialog({
  open,
  onOpenChange,
  targetPlan,
  quote,
  gateway,
  gateways,
  onGatewayChange,
  onConfirm,
  isQuoting,
  isConfirming,
  t,
}: PlanChangeDialogProps): ReactElement | null {
  if (targetPlan === null) {
    return null;
  }

  // An existing subscriber must have a quote before confirming: the confirm
  // call is keyed by quote id, and the amount shown here is the amount that
  // will be charged. Never let the button through on a pending quote.
  const requiresGateway = quote === null || !quote.isScheduledForPeriodEnd;
  const isBlocked = isQuoting || isConfirming || (requiresGateway && gateways.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('billing.planChange.title', { plan: targetPlan.name })}</DialogTitle>
          <DialogDescription>{t('billing.planChange.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {isQuoting ? <Skeleton className="h-24 w-full" /> : null}
          {!isQuoting && quote !== null ? <ProrationBreakdown quote={quote} t={t} /> : null}

          {/* A scheduled downgrade takes no payment, so it needs no gateway. */}
          {requiresGateway && gateways.length > 0 ? (
            <GatewaySelect
              value={gateway}
              onChange={onGatewayChange}
              disabled={isBlocked}
              gateways={gateways}
              t={t}
            />
          ) : null}
          {requiresGateway && gateways.length === 0 ? (
            <p className="text-muted-foreground text-sm" role="status">
              {t('billing.gateway.unavailable')}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isBlocked}>
            {isConfirming ? t('billing.planChange.confirming') : t('billing.planChange.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
