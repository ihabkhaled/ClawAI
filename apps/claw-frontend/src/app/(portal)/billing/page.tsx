'use client';

import type { ReactElement } from 'react';

import { BillingErrorBanner } from '@/components/billing/billing-error-banner';
import { BillingIntervalToggle } from '@/components/billing/billing-interval-toggle';
import { BillingStatusBanner } from '@/components/billing/billing-status-banner';
import { GatewayCheckoutDialog } from '@/components/billing/gateway-checkout-dialog';
import { InvoiceTable } from '@/components/billing/invoice-table';
import { PaymentMethodList } from '@/components/billing/payment-method-list';
import { PlanChangeDialog } from '@/components/billing/plan-change-dialog';
import { PlanComparisonGrid } from '@/components/billing/plan-comparison-grid';
import { SubscriptionSummaryCard } from '@/components/billing/subscription-summary-card';
import { UsageOverviewCard } from '@/components/billing/usage-overview-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingPage } from '@/hooks/billing/use-billing-page';

export default function BillingPage(): ReactElement {
  const {
    subscription,
    usage,
    invoices,
    paymentMethods,
    planChange,
    plans,
    checkout,
    cancellation,
    view,
    selectPlan,
    confirmPlanSelection,
    t,
  } = useBillingPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('billing.page.title')} description={t('billing.page.description')} />

      <BillingStatusBanner subscription={subscription.subscription} t={t} />

      {checkout.error !== null ? (
        <BillingErrorBanner message={checkout.error} onDismiss={checkout.clearError} t={t} />
      ) : null}
      {planChange.error !== null ? (
        <BillingErrorBanner message={planChange.error} onDismiss={planChange.clearError} t={t} />
      ) : null}
      {cancellation.error !== null ? (
        <BillingErrorBanner
          message={cancellation.error}
          onDismiss={cancellation.clearError}
          t={t}
        />
      ) : null}
      {paymentMethods.error !== null ? (
        <BillingErrorBanner
          message={paymentMethods.error}
          onDismiss={paymentMethods.clearError}
          t={t}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {subscription.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <SubscriptionSummaryCard
            subscription={subscription.subscription}
            onCancel={() => view.setIsCancelOpen(true)}
            onResume={cancellation.resume}
            onEndNow={() => view.setIsEndNowOpen(true)}
            isCancelPending={cancellation.isCancelPending}
            isResumePending={cancellation.isResumePending}
            isEndNowPending={cancellation.isEndNowPending}
            t={t}
          />
        )}

        <UsageOverviewCard
          usage={usage.usage}
          isLoading={usage.isLoading}
          isError={usage.isError}
          t={t}
        />
      </div>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('billing.plans.title')}</h2>
          <BillingIntervalToggle value={view.interval} onChange={view.setInterval} t={t} />
        </div>

        {plans.isLoading ? <Skeleton className="h-64 w-full" /> : null}

        {plans.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('billing.plans.error')}
          </p>
        ) : null}

        {!plans.isLoading && !plans.isError && plans.plans.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('billing.plans.empty')}</p>
        ) : null}

        {!plans.isLoading && !plans.isError && plans.plans.length > 0 ? (
          <PlanComparisonGrid
            plans={plans.plans}
            subscription={subscription.subscription}
            interval={view.interval}
            onSelect={selectPlan}
            pendingPlanId={checkout.isPending ? (view.targetPlan?.id ?? null) : null}
            t={t}
          />
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <InvoiceTable
          invoices={invoices.invoices}
          isLoading={invoices.isLoading}
          isError={invoices.isError}
          onDownload={invoices.download}
          pendingId={invoices.pendingId}
          isDownloadError={invoices.isDownloadError}
          t={t}
        />
        <PaymentMethodList
          methods={paymentMethods.methods}
          isLoading={paymentMethods.isLoading}
          isError={paymentMethods.isError}
          onAdd={paymentMethods.startSetup}
          isAdding={paymentMethods.isSetupPending}
          onRemove={paymentMethods.remove}
          pendingId={paymentMethods.pendingId}
          t={t}
        />
      </div>

      <PlanChangeDialog
        open={view.targetPlan !== null}
        onOpenChange={view.closePlanChange}
        targetPlan={view.targetPlan}
        quote={planChange.quote}
        gateway={view.gateway}
        onGatewayChange={view.setGateway}
        onConfirm={confirmPlanSelection}
        isQuoting={planChange.isQuoting}
        isConfirming={planChange.isConfirming || checkout.isPending}
        t={t}
      />

      <ConfirmDialog
        open={view.isCancelOpen}
        onOpenChange={view.setIsCancelOpen}
        title={t('billing.cancel.title')}
        description={t('billing.cancel.description')}
        confirmLabel={t('billing.cancel.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={cancellation.cancel}
        isConfirming={cancellation.isCancelPending}
      />

      <ConfirmDialog
        open={view.isEndNowOpen}
        onOpenChange={view.setIsEndNowOpen}
        title={t('billing.remove.title')}
        description={t('billing.remove.description')}
        confirmLabel={t('billing.remove.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={cancellation.endNow}
        isConfirming={cancellation.isEndNowPending}
      />

      <GatewayCheckoutDialog
        session={checkout.gatewaySession}
        onClose={checkout.closeGateway}
        onComplete={checkout.completeGateway}
        t={t}
      />
      <GatewayCheckoutDialog
        session={planChange.gatewaySession}
        onClose={planChange.closeGateway}
        onComplete={planChange.completeGateway}
        t={t}
      />
      <GatewayCheckoutDialog
        session={paymentMethods.gatewaySession}
        onClose={paymentMethods.closeGateway}
        onComplete={paymentMethods.completeGateway}
        t={t}
      />
    </div>
  );
}
