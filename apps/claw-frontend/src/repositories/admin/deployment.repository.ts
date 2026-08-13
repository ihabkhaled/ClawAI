import type { DeploymentStatusView } from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';

export const deploymentRepository = {
  async get(): Promise<DeploymentStatusView> {
    const response = await apiClient.get<DeploymentStatusView>('/admin/deployment');
    return response.data;
  },
};
