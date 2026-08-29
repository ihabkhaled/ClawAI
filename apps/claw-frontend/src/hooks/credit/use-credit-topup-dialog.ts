import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  CREDIT_TOPUP_DEFAULT_GATEWAY,
  CREDIT_TOPUP_QUERY_KEY,
  CREDIT_TOPUP_QUERY_VALUE,
} from '@/constants/credit.constants';
import type { BillingGateway } from '@/enums/billing.enum';
import type { UseCreditTopupDialogReturn } from '@/types/credit-hook.types';

// Open/close state for the top-up dialog, plus which package and gateway are
// selected.
//
// It reads `?topup=open` so the "Add credit" button on a 402 refusal lands the
// user in the dialog instead of merely on the plan page. A refusal that sends
// somebody to a screen where they still have to hunt for the purchase is how a
// blocked request becomes an abandoned one.
export function useCreditTopupDialog(): UseCreditTopupDialogReturn {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [gateway, setGateway] = useState<BillingGateway>(CREDIT_TOPUP_DEFAULT_GATEWAY);

  useEffect(() => {
    // `useSearchParams` is typed non-nullable but returns null at runtime when
    // the tree renders outside a Suspense boundary — a static prerender, or a
    // hook test that mounts this without a router. Reading `.get` off that
    // throws and takes the whole page down, which is a spectacularly bad way to
    // fail at "should the top-up dialog open?".
    if (searchParams?.get(CREDIT_TOPUP_QUERY_KEY) === CREDIT_TOPUP_QUERY_VALUE) {
      setIsOpen(true);
    }
  }, [searchParams]);

  const open = useCallback((): void => {
    setIsOpen(true);
  }, []);

  const close = useCallback((): void => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    open,
    close,
    selectedPackageId,
    selectPackage: setSelectedPackageId,
    gateway,
    setGateway,
  };
}
