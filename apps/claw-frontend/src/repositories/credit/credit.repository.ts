import { CREDIT_API_BASE, CREDIT_LEDGER_PAGE_SIZE } from '@claw/shared-constants';
import type { CreditPackageView, PaygWalletSnapshot } from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';
import type {
  CreditLedgerPage,
  CreditTopupRequest,
  CreditTopupSessionView,
} from '@/types/credit.types';

// The only place the browser talks to the credit API.
//
// Two services answer here and the split is not cosmetic. The wallet, the
// ledger and the package catalog are owned by auth-service and reached through
// the NEW `/api/v1/credit` nginx location; buying credit is owned by
// payment-service and reuses the `/api/v1/billing` location that already
// proxies there. Putting the wallet under `/billing` would have routed an
// auth-owned read to the payment service.
//
// Note what is NOT sent below: no amount, no currency, no credit figure and no
// user id. The wallet comes from the JWT and every number in a top-up is
// resolved server-side from the immutable CreditPackageVersion.
class CreditRepository {
  async getWallet(): Promise<PaygWalletSnapshot> {
    const response = await apiClient.get<PaygWalletSnapshot>(`${CREDIT_API_BASE}/me`);
    return response.data;
  }

  // `cursor` is an opaque row id from the previous page, never an offset: rows
  // are appended while the user reads, and an offset would repeat or skip a
  // line every time a request settled mid-scroll.
  async getLedger(cursor: string | null): Promise<CreditLedgerPage> {
    const params: Record<string, string> = { limit: String(CREDIT_LEDGER_PAGE_SIZE) };
    if (cursor !== null) {
      params['cursor'] = cursor;
    }
    const response = await apiClient.get<CreditLedgerPage>(`${CREDIT_API_BASE}/me/ledger`, params);
    return response.data;
  }

  async listPackages(): Promise<CreditPackageView[]> {
    const response = await apiClient.get<CreditPackageView[]>(`${CREDIT_API_BASE}/packages`);
    return response.data;
  }

  // payment-service. Server-priced from the package version it fetches out of
  // auth; the body carries a package id and never an amount.
  async createTopupSession(input: CreditTopupRequest): Promise<CreditTopupSessionView> {
    const response = await apiClient.post<CreditTopupSessionView>(
      '/billing/credit-topup/checkout-sessions',
      input,
    );
    return response.data;
  }

  async getTopupPackages(): Promise<CreditPackageView[]> {
    const response = await apiClient.get<CreditPackageView[]>('/billing/credit-topup/packages');
    return response.data;
  }
}

export const creditRepository = new CreditRepository();
