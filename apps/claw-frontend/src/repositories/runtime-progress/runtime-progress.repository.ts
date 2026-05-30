import { apiClient } from '@/services/shared/api-client';
import type { RuntimeProbeReport } from '@/types/runtime-probe-report.types';

// Admin runtime diagnostics — every probe call goes through these two
// helpers. Calls live under each runtime's existing service prefix so they
// inherit the runtime's own auth + rate-limit middleware. See
// docs/04-backend/ollama-service.md + docs/04-backend/llamacpp-service.md
// for the BE endpoints.
const OLLAMA_PROBE_PATH = '/ollama/runtime-progress/probe';
const LLAMACPP_PROBE_PATH = '/llamacpp/runtime-progress/probe';

export async function getOllamaProbeReport(): Promise<RuntimeProbeReport> {
  const response = await apiClient.get<RuntimeProbeReport>(OLLAMA_PROBE_PATH);
  return response.data;
}

export async function getLlamacppProbeReport(): Promise<RuntimeProbeReport> {
  const response = await apiClient.get<RuntimeProbeReport>(LLAMACPP_PROBE_PATH);
  return response.data;
}
