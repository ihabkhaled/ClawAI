// model-exposure.service.ts
// Thin service module — no React, no component code.

import type {
  ConnectorModelRow,
  SetModelExposureRequest,
  SetModelExposureResponse,
  ModelExposureFilters,
} from '../../types/model-exposure.types';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchConnectorModels(connectorId: string): Promise<ConnectorModelRow[]> {
  return http<ConnectorModelRow[]>(`/api/v1/connectors/${connectorId}/models`);
}

export async function setModelExposure(
  connectorId: string,
  request: SetModelExposureRequest,
): Promise<SetModelExposureResponse> {
  return http<SetModelExposureResponse>(`/api/v1/connectors/${connectorId}/models/exposure`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
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
