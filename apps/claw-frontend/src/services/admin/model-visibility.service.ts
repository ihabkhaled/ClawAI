// model-visibility.service.ts
// Thin service module — no React, no component code.

import { apiClient } from '@/services/shared/api-client';

import type { ModelVisibilityReport } from '../../types/model-visibility.types';

// Query params, not a path: Gemini keys carry a slash (`models/gemini-decision-1`).
export async function fetchModelVisibility(
  provider: string,
  modelKey: string,
): Promise<ModelVisibilityReport> {
  const response = await apiClient.get<ModelVisibilityReport>('/connectors/model-visibility', {
    provider,
    modelKey,
  });
  return response.data;
}
