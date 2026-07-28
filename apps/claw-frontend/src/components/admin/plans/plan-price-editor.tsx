'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_PLAN_CURRENCIES } from '@/constants/billing.constants';
import { BillingInterval } from '@/enums/billing.enum';
import type { UseAdminPlanPricesResult } from '@/types/admin-plan-price.types';
import { formatMinorAmount } from '@/utilities';

export function PlanPriceEditor(controller: UseAdminPlanPricesResult): ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{controller.t('common.create')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="billing-interval" className="text-sm font-medium">
              {controller.t('billing.interval.toggleLabel')}
            </label>
            <Select
              value={controller.billingInterval}
              onValueChange={(value) => controller.setBillingInterval(value as BillingInterval)}
            >
              <SelectTrigger id="billing-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BillingInterval.MONTHLY}>
                  {controller.t('billing.interval.MONTHLY')}
                </SelectItem>
                <SelectItem value={BillingInterval.YEARLY}>
                  {controller.t('billing.interval.YEARLY')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="price-currency" className="text-sm font-medium">
              {controller.t('adminPlans.form.currency')}
            </label>
            <Select value={controller.currency} onValueChange={controller.setCurrency}>
              <SelectTrigger id="price-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_PLAN_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="price-amount" className="text-sm font-medium">
              {controller.t('adminRefunds.amount')}
            </label>
            <Input
              id="price-amount"
              type="number"
              min="0"
              step="0.01"
              value={controller.amount}
              onChange={(event) => controller.setAmount(event.target.value)}
            />
          </div>
          {controller.saveError === null ? null : (
            <p role="alert" className="text-destructive text-sm">
              {controller.saveError.message}
            </p>
          )}
          <Button type="button" disabled={controller.isSaving} onClick={controller.publish}>
            {controller.isSaving ? controller.t('common.loading') : controller.t('common.create')}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {controller.prices.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border p-6 text-center text-sm">
            {controller.t('billing.plans.empty')}
          </p>
        ) : null}
        {controller.prices.map((price) => (
          <Card key={price.id}>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">v{price.version}</p>
                <p className="font-semibold">
                  {formatMinorAmount(price.amountMinor, price.currency, controller.locale)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {controller.t('billing.interval.toggleLabel')}
                </p>
                <p>{controller.t(`billing.interval.${price.billingInterval}`)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {controller.t('adminPlans.statusActive')}
                </p>
                <p>{price.isActive ? controller.t('common.yes') : controller.t('common.no')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {controller.t('billing.summary.renewsOn')}
                </p>
                <p>{new Date(price.effectiveFrom).toLocaleString(controller.locale)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {controller.t('adminBilling.subscriptions')}
                </p>
                <p>{controller.subscriberCounts.get(price.id) ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
