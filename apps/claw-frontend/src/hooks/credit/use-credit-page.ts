import { useCallback, useEffect } from 'react';

import { useBillingGateways } from '@/hooks/billing/use-billing-gateways';
import { useCreditLedger } from '@/hooks/credit/use-credit-ledger';
import { useCreditPackages } from '@/hooks/credit/use-credit-packages';
import { useCreditTopup } from '@/hooks/credit/use-credit-topup';
import { useCreditTopupDialog } from '@/hooks/credit/use-credit-topup-dialog';
import { useCreditWallet } from '@/hooks/credit/use-credit-wallet';
import { useTranslation } from '@/lib/i18n';
import type { UseCreditPageReturn } from '@/types/credit-hook.types';

// Controller hook for every credit surface. It composes the focused hooks and
// owns exactly one decision: that confirming the dialog needs BOTH a package and
// a gateway, and does nothing at all without them.
//
// One hook per page, so /plan and /billing render the same balance from the same
// cache entry rather than two components each fetching their own wallet.
export function useCreditPage(): UseCreditPageReturn {
  const { t, locale } = useTranslation();
  const wallet = useCreditWallet();
  const ledger = useCreditLedger();
  const packages = useCreditPackages();
  const topup = useCreditTopup();
  const dialog = useCreditTopupDialog();
  const { gateways } = useBillingGateways();
  const { selectedPackageId, selectPackage, close } = dialog;

  // Preselect the first package so the dialog is never a list with no default
  // and a disabled confirm button.
  useEffect(() => {
    const first = packages.packages.at(0);
    if (selectedPackageId === null && first !== undefined) {
      selectPackage(first.id);
    }
  }, [packages.packages, selectedPackageId, selectPackage]);

  // The gateway dialog takes over once a session exists, so the package picker
  // must get out of the way rather than stack behind it.
  useEffect(() => {
    if (topup.gatewaySession !== null) {
      close();
    }
  }, [topup.gatewaySession, close]);

  const confirmTopup = useCallback((): void => {
    if (dialog.selectedPackageId === null) {
      return;
    }
    topup.startTopup({ packageId: dialog.selectedPackageId, gateway: dialog.gateway });
  }, [dialog.gateway, dialog.selectedPackageId, topup]);

  return { wallet, ledger, packages, topup, dialog, gateways, confirmTopup, t, locale };
}
