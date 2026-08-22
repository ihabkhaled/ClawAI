'use client';

import { BillingErrorBanner } from '@/components/billing/billing-error-banner';
import { GatewayCheckoutDialog } from '@/components/billing/gateway-checkout-dialog';
import { GatewaySelect } from '@/components/billing/gateway-select';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingCheckoutPage } from '@/hooks/billing/use-billing-checkout-page';

export function BillingCheckoutContent(): React.ReactElement {
  const controller = useBillingCheckoutPage();
  const { checkout, t } = controller;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <PageHeader
        title={t('billing.gatewayDialog.title')}
        description={t('billing.planChange.description')}
      />
      {controller.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {checkout.error !== null ? (
        <BillingErrorBanner message={checkout.error} onDismiss={checkout.clearError} t={t} />
      ) : null}
      {!controller.isLoading && controller.hasCatalogError ? (
        <p className="text-destructive text-sm" role="alert">
          {t('billing.plans.error')}
        </p>
      ) : null}
      {!controller.isLoading && controller.plan !== null && controller.formattedPrice !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>{controller.plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5">
            <p className="text-3xl font-bold">{controller.formattedPrice}</p>
            {!controller.hasAvailableGateways ? (
              <p className="text-muted-foreground text-sm" role="status">
                {t('billing.gateway.unavailable')}
              </p>
            ) : (
              <GatewaySelect
                value={controller.gateway}
                onChange={controller.setGateway}
                disabled={checkout.isPending}
                gateways={controller.gateways}
                t={t}
              />
            )}
            <Button
              type="button"
              disabled={!controller.canCheckout || checkout.isPending}
              onClick={controller.handleCheckout}
            >
              {checkout.isPending
                ? t('billing.planChange.confirming')
                : t('billing.planChange.confirm')}
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <GatewayCheckoutDialog
        session={checkout.gatewaySession}
        gateways={controller.gateways}
        onClose={checkout.closeGateway}
        onComplete={checkout.completeGateway}
        t={t}
      />
    </div>
  );
}
