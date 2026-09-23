import { GRAFANA_ACCESS_ENDPOINT } from '@/constants/grafana.constants';
import { apiClient } from '@/services/shared/api-client';
import type { GrafanaAccessGrant } from '@/types/grafana-access.types';

/**
 * Asks auth-service for the Grafana cookie. The response sets it (httpOnly,
 * Path=/grafana); the body only says when it expires.
 */
export async function grantGrafanaAccess(): Promise<GrafanaAccessGrant> {
  const response = await apiClient.post<GrafanaAccessGrant>(GRAFANA_ACCESS_ENDPOINT, {});
  return response.data;
}
