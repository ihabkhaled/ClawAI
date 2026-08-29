import { ADMIN_CREDIT_API_BASE } from '@claw/shared-constants';
import type { CreditPackageView, PaygWalletSnapshot } from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';
import type {
  AdjustCreditRequest,
  CreateCreditPackageRequest,
  PublishCreditPackageVersionRequest,
} from '@/types/credit.types';

// Operator access to any wallet and to the top-up catalog. Routed under the
// `/api/v1/admin` prefix nginx already proxies to auth-service, so no new
// location is needed for the admin half of PAYG credit.
//
// There is deliberately no package UPDATE call. A price change publishes a NEW
// immutable version, because rewriting a version would change what an existing
// purchase was quoted.
export const adminCreditRepository = {
  async getWallet(userId: string): Promise<PaygWalletSnapshot> {
    const response = await apiClient.get<PaygWalletSnapshot>(
      `${ADMIN_CREDIT_API_BASE}/wallets/${encodeURIComponent(userId)}`,
    );
    return response.data;
  },

  // The actor is taken from the JWT server-side and is never sent here: "who
  // moved this money" must not be something the caller gets to assert.
  async adjust(userId: string, payload: AdjustCreditRequest): Promise<PaygWalletSnapshot> {
    const response = await apiClient.post<PaygWalletSnapshot>(
      `${ADMIN_CREDIT_API_BASE}/wallets/${encodeURIComponent(userId)}/adjust`,
      payload,
    );
    return response.data;
  },

  async listPackages(): Promise<CreditPackageView[]> {
    const response = await apiClient.get<CreditPackageView[]>(`${ADMIN_CREDIT_API_BASE}/packages`);
    return response.data;
  },

  async createPackage(payload: CreateCreditPackageRequest): Promise<CreditPackageView> {
    const response = await apiClient.post<CreditPackageView>(
      `${ADMIN_CREDIT_API_BASE}/packages`,
      payload,
    );
    return response.data;
  },

  async publishVersion(
    packageId: string,
    payload: PublishCreditPackageVersionRequest,
  ): Promise<CreditPackageView> {
    const response = await apiClient.post<CreditPackageView>(
      `${ADMIN_CREDIT_API_BASE}/packages/${encodeURIComponent(packageId)}/versions`,
      payload,
    );
    return response.data;
  },
};
