import { MODEL_EXPOSURE_BATCH_SIZE } from '@/constants';
import { ApiClientError } from '@/services/shared/api-client';

// Pure — no network, so it is unit tested without a server.
export function chunkModelKeys(modelKeys: readonly string[]): string[][] {
  if (modelKeys.length === 0) {
    return [];
  }
  const chunks: string[][] = [];
  for (let i = 0; i < modelKeys.length; i += MODEL_EXPOSURE_BATCH_SIZE) {
    chunks.push(modelKeys.slice(i, i + MODEL_EXPOSURE_BATCH_SIZE));
  }
  return chunks;
}

// A generic "Validation failed" told an operator nothing (2026-09-24: bulk
// exposing 447 OpenRouter models hit the backend's 200-key cap and gave no
// clue why). ApiClientError.errors is a Record<field, message[]> when the
// backend rejected the DTO — build a readable sentence from it before
// falling back to the generic message.
export function describeModelExposureError(err: unknown): string {
  if (err instanceof ApiClientError && err.errors !== undefined) {
    const detail = Object.entries(err.errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ');
    if (detail.length > 0) {
      return detail;
    }
  }
  return err instanceof Error ? err.message : 'Failed to apply';
}
