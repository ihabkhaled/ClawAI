import type { PaygWalletSnapshot } from '@claw/shared-types';

import { BillingGateway } from '@/enums/billing.enum';
import type { UseCreditPageReturn } from '@/types/credit-hook.types';

/**
 * A wallet with credit in it, for tests that only need the shape.
 *
 * The numbers are integer micro-USD, because that is what the API returns and
 * what every formatter in the credit UI expects. A fixture in dollars would
 * pass a render test and hide a real unit bug.
 */
export function creditWalletFixture(
  overrides: Partial<PaygWalletSnapshot> = {},
): PaygWalletSnapshot {
  return {
    grantMicroUsd: 3_000_000,
    purchasedMicroUsd: 0,
    reservedMicroUsd: 0,
    availableMicroUsd: 3_000_000,
    periodGrantMicroUsd: 3_000_000,
    periodKey: '2026-08',
    grantResetsAt: '2026-09-01T00:00:00.000Z',
    adminBypass: false,
    meteringEnabled: true,
    ...overrides,
  };
}

/**
 * The `credit` slice every page-controller hook now returns.
 *
 * `/plan` and `/billing` both render the balance and the "Add credit" action, so
 * both of their controller hooks compose `useCreditPage`. A page test that mocks
 * the controller has to supply this or the page crashes on `credit.wallet` —
 * which is exactly how these suites broke. Shared so the two pages cannot drift.
 */
export function creditPageFixture(
  overrides: Partial<UseCreditPageReturn> = {},
): UseCreditPageReturn {
  return {
    wallet: {
      wallet: creditWalletFixture(),
      isLoading: false,
      isError: false,
      onRetry: (): void => undefined,
    },
    ledger: {
      entries: [],
      isLoading: false,
      isError: false,
      hasMore: false,
      isFetchingMore: false,
      loadMore: (): void => undefined,
    },
    packages: { packages: [], isLoading: false, isError: false },
    topup: {
      startTopup: (): void => undefined,
      isPending: false,
      error: null,
      clearError: (): void => undefined,
      gatewaySession: null,
      closeGateway: (): void => undefined,
      completeGateway: (): Promise<void> => Promise.resolve(),
    },
    dialog: {
      isOpen: false,
      open: (): void => undefined,
      close: (): void => undefined,
      selectedPackageId: null,
      selectPackage: (): void => undefined,
      gateway: BillingGateway.PAYPAL,
      setGateway: (): void => undefined,
    },
    gateways: [],
    confirmTopup: (): void => undefined,
    t: (key: string): string => key,
    locale: 'en',
    ...overrides,
  };
}
