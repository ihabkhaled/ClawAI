import { apiClient } from '@/services/shared/api-client';
import type { AdminBillingDashboard } from '@/types/admin-billing-dashboard.types';
import type { AdminPriceSubscriberCount } from '@/types/admin-plan-price.types';

export const billingDashboardRepository = {
  async get(): Promise<AdminBillingDashboard> {
    const response = await apiClient.get<AdminBillingDashboard>('/admin/billing/dashboard', {
      days: '30',
    });
    return response.data;
  },

  async getPriceVersionSubscriberCounts(planId: string): Promise<AdminPriceSubscriberCount[]> {
    const response = await apiClient.get<AdminPriceSubscriberCount[]>(
      '/admin/billing/dashboard/price-version-counts',
      { planId },
    );
    return response.data;
  },
};
