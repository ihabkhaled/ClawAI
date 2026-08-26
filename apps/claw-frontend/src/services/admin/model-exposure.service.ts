// model-exposure.service.ts
// Thin service module — no React, no component code.

import { apiClient } from '@/services/shared/api-client';

import type {
  ConnectorModelRow,
  SetModelExposureRequest,
  SetModelExposureResponse,
  ModelExposureFilters,
} from '../../types/model-exposure.types';

// These calls go through apiClient, not a private fetch(). The app
// authenticates with a Bearer token that apiClient attaches; a raw fetch with
// `credentials: 'include'` sends cookies and no Authorization header, so every
// request here answered 401 "Missing authorization header" and the panel showed
// "Exposed vs unexposed 0 / 0" with an empty table.

export async function fetchConnectorModels(connectorId: string): Promise<ConnectorModelRow[]> {
  const response = await apiClient.get<ConnectorModelRow[]>(`/connectors/${connectorId}/models`);
  return response.data;
}

export async function setModelExposure(
  connectorId: string,
  request: SetModelExposureRequest,
): Promise<SetModelExposureResponse> {
  const response = await apiClient.put<SetModelExposureResponse>(
    `/connectors/${connectorId}/models/exposure`,
    request,
  );
  return response.data;
}

/**
 * Pure — no network, so it can be unit tested without a server.
 * A REMOVED model is always excluded from the selectable list.
 */
export function filterModels(
  rows: ConnectorModelRow[],
  filters: ModelExposureFilters,
): ConnectorModelRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (row.lifecycle === 'REMOVED') {
      return false;
    }
    if (search) {
      const hay = `${row.modelKey} ${row.displayName}`.toLowerCase();
      if (!hay.includes(search)) {
        return false;
      }
    }
    if (filters.provider !== null && row.provider !== filters.provider) {
      return false;
    }
    if (filters.exposedOnly !== null) {
      const isExposed = row.exposure === 'EXPOSED';
      if (filters.exposedOnly && !isExposed) {
        return false;
      }
      if (!filters.exposedOnly && isExposed) {
        return false;
      }
    }
    if (filters.kind !== null && row.kind !== filters.kind) {
      return false;
    }
    return true;
  });
}
