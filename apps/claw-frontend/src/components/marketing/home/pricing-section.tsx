'use client';

import Link from 'next/link';

import { CreditDualConsumptionNotice } from '@/components/billing/credit-dual-consumption-notice';
import { PlanTierCard } from '@/components/marketing/home/plan-tier-card';
import { Button } from '@/components/ui/button';
import { MARKETING_HOME_PATHS } from '@/constants/marketing-home.constants';
import { usePublicPricing } from '@/hooks/marketing/use-public-pricing';
import type { PricingSectionProps } from '@/types/public-pricing.types';
import { filterPublicPlans } from '@/utilities/pricing-catalog.utility';

export function PricingSection({
  initialPlans,
  compact = false,
  standalone = false,
}: PricingSectionProps): React.ReactElement {
  const controller = usePublicPricing(initialPlans);
  const plans = filterPublicPlans(controller.plans, compact);

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        {standalone ? (
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {controller.t('marketing.home.pricing.title')}
          </h1>
        ) : (
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {controller.t('marketing.home.pricing.title')}
          </h2>
        )}
        <p className="text-muted-foreground mt-4">{controller.t('marketing.home.pricing.intro')}</p>
      </div>

      <div
        role="group"
        aria-label={controller.t('marketing.home.pricing.toggleLabel')}
        className="border-border bg-card mx-auto mt-8 flex w-fit items-center gap-1 rounded-full border p-1"
      >
        <Button
          type="button"
          size="sm"
          variant={controller.isYearly ? 'ghost' : 'default'}
          aria-pressed={!controller.isYearly}
          className="rounded-full"
          onClick={controller.selectMonthly}
        >
          {controller.t('marketing.home.pricing.toggleMonthly')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={controller.isYearly ? 'default' : 'ghost'}
          aria-pressed={controller.isYearly}
          className="rounded-full"
          onClick={controller.selectYearly}
        >
          {controller.t('marketing.home.pricing.toggleYearly')}
        </Button>
      </div>

      {controller.isLoading ? (
        <p className="text-muted-foreground mt-10 text-center">{controller.t('common.loading')}</p>
      ) : null}
      {controller.isError ? (
        <div className="mt-10 text-center" role="alert">
          <p className="text-destructive">{controller.t('billing.plans.error')}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={controller.retry}>
            {controller.t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError && plans.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-center">
          {controller.t('billing.plans.empty')}
        </p>
      ) : null}
      {controller.isFallback ? (
        <div
          role="status"
          className="border-warning/40 bg-warning/10 text-foreground mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3 rounded-lg border px-4 py-3 text-center text-sm"
        >
          <span>{controller.t('marketing.pricing.temporaryCatalogDisclaimer')}</span>
          <Button type="button" size="sm" variant="outline" onClick={controller.retry}>
            {controller.t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError && plans.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanTierCard key={plan.id} plan={plan} isYearly={controller.isYearly} />
          ))}
        </div>
      ) : null}

      {/* The same disclaimer component, and therefore the same string, that the
          plan page, the billing page, the model selector, the top-up dialog and
          the 402 refusal render. A prospect who reads one promise here and a
          different one after signing up has been mis-sold. */}
      <CreditDualConsumptionNotice t={controller.t} className="mx-auto mt-8 max-w-4xl" />

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link href={MARKETING_HOME_PATHS.FAQ} className="text-primary hover:underline">
          {controller.t('marketing.home.pricing.linkFaq')}
        </Link>
        <Link href={MARKETING_HOME_PATHS.USE_CASES} className="text-primary hover:underline">
          {controller.t('marketing.home.pricing.linkUseCases')}
        </Link>
      </div>
    </section>
  );
}
