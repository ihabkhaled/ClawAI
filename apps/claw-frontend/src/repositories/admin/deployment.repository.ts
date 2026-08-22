import type {
  DeploymentResetResult,
  DeploymentStatusView,
  DeploymentTriggerResult,
} from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';
import type {
  DeploymentAutomationFlags,
  DeploymentTriggerInput,
} from '@/types/deployment-page.types';

export const deploymentRepository = {
  async get(): Promise<DeploymentStatusView> {
    const response = await apiClient.get<DeploymentStatusView>('/admin/deployment');
    return response.data;
  },

  async trigger(input: DeploymentTriggerInput): Promise<DeploymentTriggerResult> {
    const response = await apiClient.post<DeploymentTriggerResult>(
      '/admin/deployment/trigger',
      input,
    );
    return response.data;
  },

  async reset(): Promise<DeploymentResetResult> {
    const response = await apiClient.post<DeploymentResetResult>('/admin/deployment/reset');
    return response.data;
  },

  async setAutomation(enabled: boolean): Promise<DeploymentAutomationFlags> {
    const response = await apiClient.post<DeploymentAutomationFlags>(
      '/admin/deployment/automation',
      {
        enabled,
      },
    );
    return response.data;
  },
};
