import type { BillingGateway } from '@/enums/billing.enum';
import { apiClient } from '@/services/shared/api-client';
import type { GatewayAdminView, GatewayConfigUpdate } from '@/types/billing.types';

class GatewayConfigRepository {
  async list(): Promise<GatewayAdminView[]> {
    const response = await apiClient.get<GatewayAdminView[]>('/admin/payment-gateways');
    return response.data;
  }

  async update(gateway: BillingGateway, input: GatewayConfigUpdate): Promise<GatewayAdminView> {
    const response = await apiClient.put<GatewayAdminView>(
      `/admin/payment-gateways/${encodeURIComponent(gateway)}`,
      input,
    );
    return response.data;
  }
}

export const gatewayConfigRepository = new GatewayConfigRepository();
