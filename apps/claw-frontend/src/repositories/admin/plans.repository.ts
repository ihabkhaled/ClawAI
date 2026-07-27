import { apiClient } from '@/services/shared/api-client';
import type {
  CreatePlanRequest,
  PlanUserIds,
  PlanView,
  ReorderPlansRequest,
  UpdatePlanModelAccessRequest,
  UpdatePlanRequest,
} from '@/types';
import type {
  AdminPlanPriceVersion,
  PublishAdminPlanPriceRequest,
} from '@/types/admin-plan-price.types';

const PLANS_BASE = '/admin/plans';

export const plansRepository = {
  async list(): Promise<PlanView[]> {
    const response = await apiClient.get<PlanView[]>(PLANS_BASE);
    return response.data;
  },

  async get(id: string): Promise<PlanView> {
    const response = await apiClient.get<PlanView>(`${PLANS_BASE}/${encodeURIComponent(id)}`);
    return response.data;
  },

  async create(payload: CreatePlanRequest): Promise<PlanView> {
    const response = await apiClient.post<PlanView>(PLANS_BASE, payload);
    return response.data;
  },

  async update(id: string, payload: UpdatePlanRequest): Promise<PlanView> {
    const response = await apiClient.patch<PlanView>(
      `${PLANS_BASE}/${encodeURIComponent(id)}`,
      payload,
    );
    return response.data;
  },

  async activate(id: string): Promise<PlanView> {
    const response = await apiClient.post<PlanView>(
      `${PLANS_BASE}/${encodeURIComponent(id)}/activate`,
    );
    return response.data;
  },

  async deactivate(id: string): Promise<PlanView> {
    const response = await apiClient.post<PlanView>(
      `${PLANS_BASE}/${encodeURIComponent(id)}/deactivate`,
    );
    return response.data;
  },

  async setDefault(id: string): Promise<PlanView> {
    const response = await apiClient.post<PlanView>(
      `${PLANS_BASE}/${encodeURIComponent(id)}/set-default`,
    );
    return response.data;
  },

  async reorder(payload: ReorderPlansRequest): Promise<PlanView[]> {
    const response = await apiClient.post<PlanView[]>(`${PLANS_BASE}/reorder`, payload);
    return response.data;
  },

  async updateModelAccess(id: string, payload: UpdatePlanModelAccessRequest): Promise<PlanView> {
    const response = await apiClient.put<PlanView>(
      `${PLANS_BASE}/${encodeURIComponent(id)}/model-access`,
      payload,
    );
    return response.data;
  },

  async listUsers(id: string): Promise<PlanUserIds> {
    const response = await apiClient.get<PlanUserIds>(
      `${PLANS_BASE}/${encodeURIComponent(id)}/users`,
    );
    return response.data;
  },

  async assignUser(userId: string, planId: string): Promise<PlanView> {
    const response = await apiClient.post<PlanView>(
      `${PLANS_BASE}/users/${encodeURIComponent(userId)}/assign`,
      { planId },
    );
    return response.data;
  },

  async listPriceVersions(id: string): Promise<AdminPlanPriceVersion[]> {
    const response = await apiClient.get<AdminPlanPriceVersion[]>(
      `${PLANS_BASE}/${encodeURIComponent(id)}/price-versions`,
    );
    return response.data;
  },

  async publishPrice(
    id: string,
    payload: PublishAdminPlanPriceRequest,
  ): Promise<AdminPlanPriceVersion> {
    const response = await apiClient.post<AdminPlanPriceVersion>(
      `${PLANS_BASE}/${encodeURIComponent(id)}/price-versions`,
      payload,
    );
    return response.data;
  },
};
