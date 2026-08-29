'use client';

import type { ReactElement } from 'react';

import { CreditDualConsumptionNotice } from '@/components/billing/credit-dual-consumption-notice';
import { CreditPackagePicker } from '@/components/billing/credit-package-picker';
import { GatewaySelect } from '@/components/billing/gateway-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CreditTopupDialogProps } from '@/types/credit-component.types';

/**
 * Choose a package, choose a gateway, confirm.
 *
 * Deliberately NOT a second checkout implementation: confirming here produces a
 * session that the existing `GatewayCheckoutDialog` drives, so PayPal's SDK
 * flow, Paymob's popup polling and the verification rules stay in exactly one
 * place. Forking them for top-ups would fork the money path.
 *
 * No close button of its own — `DialogContent` renders the only one.
 */
export function CreditTopupDialog({
  open,
  onOpenChange,
  packages,
  isPackagesLoading,
  isPackagesError,
  selectedPackageId,
  onSelectPackage,
  gateway,
  gateways,
  onGatewayChange,
  onConfirm,
  isConfirming,
  errorMessage,
  t,
  locale,
}: CreditTopupDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('billing.credit.topupTitle')}</DialogTitle>
          <DialogDescription>{t('billing.credit.topupDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <CreditPackagePicker
            packages={packages}
            selectedPackageId={selectedPackageId}
            onSelect={onSelectPackage}
            isLoading={isPackagesLoading}
            isError={isPackagesError}
            t={t}
            locale={locale}
          />

          <GatewaySelect
            value={gateway}
            onChange={onGatewayChange}
            gateways={gateways}
            disabled={isConfirming}
            t={t}
          />

          <CreditDualConsumptionNotice t={t} />

          {errorMessage === null ? null : (
            <p className="text-destructive text-sm" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming || selectedPackageId === null}
          >
            {isConfirming ? t('billing.credit.topupConfirming') : t('billing.credit.topupConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
