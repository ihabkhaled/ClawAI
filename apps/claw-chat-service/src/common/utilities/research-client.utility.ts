import { Logger } from '@nestjs/common';

import { httpRequest } from './http-client.utility';
import { buildInterServiceAuthHeader } from './inter-service-auth.utility';
import {
  RESEARCH_CRAWL_REQUEST_TIMEOUT_MS,
  RESEARCH_REQUEST_TIMEOUT_MS,
  SEARCH_FETCH_EXTRACT_DEFAULT_MAX_RESULTS,
  SEARCH_ONLY_DEFAULT_MAX_RESULTS,
  SEARCH_THEN_FETCH_DEFAULT_MAX_RESULTS,
} from '../constants/research-client.constants';
import type {
  ResearchRequest,
  ResearchRunResponse,
} from '../../modules/chat-messages/types/research.types';
import { ResearchWorkflow } from '../enums/research-workflow.enum';

const logger = new Logger('ResearchClient');

/**
 * Call the research-service to produce an evidence bundle for a single chat
 * turn, on the INTERNAL service-token route, naming the user explicitly.
 *
 * This used to forward the user's bearer token to the user route, which is
 * gated ADMIN_SYSTEM_VIEW. Every non-admin user got a 403 that was swallowed
 * below to `null`, so research silently never ran for anyone but an admin —
 * and testing as an admin showed it working. The plan gate is applied in this
 * service before any call gets here, which is why the internal route may trust
 * the stated user id.
 */
export async function runResearch(
  baseUrl: string,
  request: ResearchRequest,
): Promise<ResearchRunResponse | null> {
  const start = Date.now();
  try {
    const response = await httpRequest<ResearchRunResponse>({
      url: `${baseUrl}/api/v1/internal/research/runs`,
      method: 'POST',
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: {
        userId: request.userId,
        intent: request.intent,
        workflow: request.workflow,
        searchProviderId: request.searchProviderId,
        requestedModel: request.requestedModel,
        requestedProvider: request.requestedProvider,
        maxResults: request.maxResults ?? inferDefaultMaxResults(request.workflow),
        correlationId: request.correlationId,
        maxPages: request.maxPages,
        searchQuery: request.searchQuery,
      },
      timeoutMs:
        request.workflow === ResearchWorkflow.SITE_CRAWL
          ? RESEARCH_CRAWL_REQUEST_TIMEOUT_MS
          : RESEARCH_REQUEST_TIMEOUT_MS,
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

function inferDefaultMaxResults(workflow: ResearchWorkflow): number {
  switch (workflow) {
    case ResearchWorkflow.SEARCH_ONLY:
      return SEARCH_ONLY_DEFAULT_MAX_RESULTS;
    case ResearchWorkflow.SEARCH_THEN_FETCH:
      return SEARCH_THEN_FETCH_DEFAULT_MAX_RESULTS;
    case ResearchWorkflow.SEARCH_FETCH_EXTRACT:
      return SEARCH_FETCH_EXTRACT_DEFAULT_MAX_RESULTS;
    case ResearchWorkflow.SITE_CRAWL:
      // SITE_CRAWL has no search step, so this value is never read by
      // research-service for it; a value is still returned because the
      // request body always carries one.
      return SEARCH_ONLY_DEFAULT_MAX_RESULTS;
    default:
      return SEARCH_ONLY_DEFAULT_MAX_RESULTS;
  }
}
