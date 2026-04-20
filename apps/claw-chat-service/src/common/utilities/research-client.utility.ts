import { Logger } from '@nestjs/common';

import { httpRequest } from './http-client.utility';
import type {
  ResearchRequest,
  ResearchRunResponse,
} from '../../modules/chat-messages/types/research.types';

const logger = new Logger('ResearchClient');

/**
 * Call the research-service to produce an evidence bundle for a single chat
 * turn. The caller's bearer token is forwarded so the research-service's
 * AuthGuard sees the same user and the run is stored under their id.
 */
export async function runResearch(
  baseUrl: string,
  request: ResearchRequest,
): Promise<ResearchRunResponse | null> {
  const start = Date.now();
  try {
    const response = await httpRequest<ResearchRunResponse>({
      url: `${baseUrl}/api/v1/research/runs`,
      method: 'POST',
      headers: { Authorization: `Bearer ${request.userToken}` },
      body: {
        intent: request.intent,
        workflow: request.workflow,
        searchProviderId: request.searchProviderId,
        requestedModel: request.requestedModel,
        requestedProvider: request.requestedProvider,
        maxResults: request.maxResults,
      },
      timeoutMs: 45_000,
    });
    if (!response.ok) {
      logger.warn(
        `runResearch: non-2xx status=${String(response.status)} for user=${request.userId}`,
      );
      return null;
    }
    const latency = Date.now() - start;
    logger.log(`runResearch: completed in ${String(latency)}ms runId=${response.data.id}`);
    return response.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`runResearch: failed for user=${request.userId}: ${message}`);
    return null;
  }
}
