'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PlanRowProps } from '@/types';
import { formatNullableLimit, formatTokenCount } from '@/utilities';

export function PlanRow({
  plan,
  pendingId,
  onActivate,
  onDeactivate,
  onSetDefault,
  onSetPopular,
  onRetire,
  onEditHref,
  onModelAccessHref,
  onPricesHref,
  t,
}: PlanRowProps): ReactElement {
  const isPending = pendingId === plan.id;
  const unlimited = t('adminPlans.unlimited');

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{plan.name}</span>
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{plan.slug}</code>
          {plan.isDefault ? (
            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
              {t('adminPlans.signupPlanBadge')}
            </span>
          ) : null}
          {plan.isPopular ? (
            <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600 dark:text-purple-400">
              {t('adminPlans.popularBadge')}
            </span>
          ) : null}
          <span
            className={
              plan.isActive
                ? 'rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-xs'
            }
          >
            {plan.isActive ? t('adminPlans.statusActive') : t('adminPlans.statusInactive')}
          </span>
          {plan.isPublic ? null : (
            <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
              {t('adminPlans.privateBadge')}
            </span>
          )}
        </div>

        {plan.description !== null ? (
          <p className="text-muted-foreground text-sm">{plan.description}</p>
        ) : null}

        <div className="text-muted-foreground grid grid-cols-1 gap-1 text-xs sm:grid-cols-3">
          <div>
            <span className="text-foreground font-medium">{t('adminPlans.dailyQuota')}</span>:{' '}
            {formatTokenCount(plan.dailyTokenQuota)}
          </div>
          <div>
            <span className="text-foreground font-medium">{t('adminPlans.monthlyQuota')}</span>:{' '}
            {formatNullableLimit(plan.monthlyTokenQuota, unlimited)}
          </div>
          <div>
            <span className="text-foreground font-medium">{t('adminPlans.modelRules')}</span>:{' '}
            {plan.modelAccess.length}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={onEditHref}>{t('common.edit')}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={onModelAccessHref}>{t('adminPlans.modelAccessAction')}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={onPricesHref}>{t('billing.summary.price')}</Link>
          </Button>
          {plan.isActive ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onDeactivate(plan.id)}
              disabled={isPending}
            >
              {t('adminPlans.deactivate')}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onActivate(plan.id)}
              disabled={isPending}
            >
              {t('adminPlans.activate')}
            </Button>
          )}
          {plan.isPopular ? null : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSetPopular(plan.id)}
              disabled={isPending}
            >
              {t('adminPlans.setMostPopular')}
            </Button>
          )}
          {plan.isDefault ? null : (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onSetDefault(plan.id)}
                disabled={isPending}
              >
                {t('adminPlans.setSignupPlan')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onRetire(plan.id, plan.name)}
                disabled={isPending}
              >
                {t('common.delete')}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
