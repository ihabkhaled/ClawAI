import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PaymentMethodListProps } from '@/types/billing-component.types';

export function PaymentMethodList({
  methods,
  isLoading,
  isError,
  onAdd,
  isAdding,
  onRemove,
  pendingId,
  t,
}: PaymentMethodListProps): ReactElement {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="grid grid-cols-1 gap-1">
          <CardTitle className="text-lg">{t('billing.paymentMethods.title')}</CardTitle>
          <p className="text-muted-foreground text-xs">{t('billing.paymentMethods.consent')}</p>
        </div>
        <Button type="button" size="sm" disabled={isAdding} onClick={onAdd}>
          {isAdding ? t('billing.paymentMethods.adding') : t('billing.paymentMethods.add')}
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        {isLoading ? <Skeleton className="h-16 w-full" /> : null}

        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('billing.paymentMethods.error')}
          </p>
        ) : null}

        {!isLoading && !isError && methods.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('billing.paymentMethods.empty')}</p>
        ) : null}

        {methods.map((method) => (
          <div
            key={method.id}
            className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="grid min-w-0 grid-cols-1 gap-0.5 text-sm">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {/* Only the gateway's own display fields are ever stored or
                    shown. There is no PAN and no CVV anywhere in this payload. */}
                {method.brand ?? t(`billing.gateway.${method.gateway}`)}
                {method.last4 === null ? null : <span>•••• {method.last4}</span>}
                {method.isDefault ? (
                  <Badge variant="outline">{t('billing.paymentMethods.default')}</Badge>
                ) : null}
              </span>
              {method.expiryMonth === null || method.expiryYear === null ? null : (
                <span className="text-muted-foreground text-xs">
                  {t('billing.paymentMethods.expires', {
                    month: String(method.expiryMonth).padStart(2, '0'),
                    year: String(method.expiryYear),
                  })}
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingId === method.id}
              onClick={() => onRemove(method.id)}
            >
              {pendingId === method.id
                ? t('billing.paymentMethods.removing')
                : t('billing.paymentMethods.remove')}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
