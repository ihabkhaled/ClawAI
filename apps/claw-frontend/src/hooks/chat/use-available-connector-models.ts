import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ConnectorModel } from '@/types';

// Chat-picker source of cloud/connector models. Uses the USER-facing
// MODEL_USE_ALLOWED endpoint (NOT the connector-admin list), so normal users
// can pick OpenAI/Anthropic/Gemini/etc. without the connector management page.
export function useAvailableConnectorModels(): {
  models: ConnectorModel[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.connectors.availableModels(),
    queryFn: () => connectorRepository.getAvailableModels(),
  });

  // Memoised rather than `data ?? []` so an unresolved or failed query keeps one
  // stable empty array instead of minting a new identity every render. See the
  // note in use-local-models.ts: an unstable empty array here propagates into
  // useAvailableModels' useMemo and can drive a render loop downstream.
  const models = useMemo(() => data ?? [], [data]);

  return { models, isLoading };
}
