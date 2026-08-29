'use client';

import type { ReactElement } from 'react';

import { AllowedModelsList } from '@/components/account/allowed-models-list';
import { PlanCard } from '@/components/account/plan-card';
import { UsageMeter } from '@/components/account/usage-meter';
import { CreditBalanceCard } from '@/components/billing/credit-balance-card';
import { CreditTopupDialog } from '@/components/billing/credit-topup-dialog';
import { GatewayCheckoutDialog } from '@/components/billing/gateway-checkout-dialog';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlanPage } from '@/hooks/plans/use-plan-page';

export default function PlanPage(): ReactElement {
  const { t, locale, entitlements, isLoading, isError, error, onRetry, credit } = usePlanPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('userPlan.title')} description={t('userPlan.description')} />

      {isLoading ? <p className="text-muted-foreground text-sm">{t('userPlan.loading')}</p> : null}

      {isError ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
          role="alert"
        >
          <span>{error?.message ?? t('userPlan.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && entitlements === null ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-center text-sm">
          {t('userPlan.empty')}
        </p>
      ) : null}

      {!isLoading && !isError && entitlements !== null ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {entitlements.plan !== null ? (
            <PlanCard plan={entitlements.plan} t={t} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('userPlan.noPlanTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{t('userPlan.noPlanDescription')}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('userPlan.dailyQuota')}</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageMeter
                quota={entitlements.quota}
                wallet={credit.wallet.wallet}
                t={t}
                locale={locale}
              />
            </CardContent>
          </Card>

          {/* The primary purchase entry point for the whole product. A 402 in
              chat links straight here with ?topup=open, so a blocked request is
              two clicks from being unblocked instead of a hunt. */}
          <div className="lg:col-span-2">
            <CreditBalanceCard
              wallet={credit.wallet.wallet}
              isLoading={credit.wallet.isLoading}
              isError={credit.wallet.isError}
              onAddCredit={credit.dialog.open}
              t={t}
              locale={locale}
            />
          </div>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{t('userPlan.allowedModels')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AllowedModelsList models={entitlements.allowedModels} t={t} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <CreditTopupDialog
        open={credit.dialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            credit.dialog.close();
          }
        }}
        packages={credit.packages.packages}
        isPackagesLoading={credit.packages.isLoading}
        isPackagesError={credit.packages.isError}
        selectedPackageId={credit.dialog.selectedPackageId}
        onSelectPackage={credit.dialog.selectPackage}
        gateway={credit.dialog.gateway}
        gateways={credit.gateways}
        onGatewayChange={credit.dialog.setGateway}
        onConfirm={credit.confirmTopup}
        isConfirming={credit.topup.isPending}
        errorMessage={credit.topup.error}
        t={t}
        locale={locale}
      />

      <GatewayCheckoutDialog
        session={credit.topup.gatewaySession}
        gateways={credit.gateways}
        onClose={credit.topup.closeGateway}
        onComplete={credit.topup.completeGateway}
        t={t}
      />
    </div>
  );
}
