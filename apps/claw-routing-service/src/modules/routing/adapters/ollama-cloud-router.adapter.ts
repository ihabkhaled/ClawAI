import { Injectable, Logger } from '@nestjs/common';
import { RouterErrorCode } from '../../../common/enums';
import { httpRequest } from '../../../common/utilities';
import { RouterProvider } from '../../../generated/prisma';
import {
  OLLAMA_CHAT_PATH,
  OLLAMA_JSON_FORMAT,
  ROUTER_MAX_OUTPUT_TOKENS,
  ROUTER_TEMPERATURE,
} from '../constants/router-adapter.constants';
import { ConnectorCredentialService } from '../services/connector-credential.service';
import type { OllamaChatResponse } from '../types/router-adapter.types';
import type {
  RouterInferenceProvider,
  RouterInferenceRequest,
  RouterInferenceResponse,
} from '../types/router-inference.types';
import {
  emptyContentFailure,
  failureFromHttpStatus,
  failureFromThrown,
} from '../utilities/router-adapter-response.utility';
import { normalizeOllamaCloudBaseUrl } from '../utilities/router-base-url.utility';

/**
 * Router inference through Ollama Cloud's native chat endpoint.
 *
 * This is the hosted ollama.com service, NOT the local runtime — they are
 * separate providers in the registry precisely because they differ in privacy
 * and billing. connector-service already rewrites any localhost Ollama base URL
 * to https://ollama.com/api, so the credential's baseUrl is the cloud one.
 *
 * Billing is subscription/usage-limit rather than per token, so token counts
 * are reported when present but never converted into a fabricated price.
 */
@Injectable()
export class OllamaCloudRouterAdapter implements RouterInferenceProvider {
  readonly provider = RouterProvider.OLLAMA_CLOUD;
  private readonly logger = new Logger(OllamaCloudRouterAdapter.name);

  constructor(private readonly credentials: ConnectorCredentialService) {}

  async invoke(request: RouterInferenceRequest): Promise<RouterInferenceResponse> {
    // Credential resolution is its own network hop; timing it as provider
    // latency would misattribute a connector-service round trip, and spending
    // the entry's whole timeout on it would overrun the walk's total deadline.
    const resolveStartedAt = Date.now();
    // The registry provider is OLLAMA_CLOUD, but connector-service knows this
    // connector as OLLAMA — one enum value still serves both there.
    const credential = await this.credentials.resolve(RouterProvider.OLLAMA);
    const resolveMs = Date.now() - resolveStartedAt;
    const startedAt = Date.now();

    // connector-service rewrites a localhost Ollama base URL to ollama.com ONLY
    // inside its own private adapter — the /internal/connectors/config payload
    // returns whatever the row stores. Without mirroring that here, a connector
    // saved with the UI's default `http://localhost:11434` would have the cloud
    // API key POSTed at the local runtime, on a path it does not serve.
    const baseUrl = normalizeOllamaCloudBaseUrl(credential?.baseUrl ?? null);

    if (!credential?.apiKey) {
      this.logger.warn('invoke: no Ollama Cloud credential configured');
      return {
        ok: false,
        code: RouterErrorCode.AUTHENTICATION_FAILED,
        safeMessage: 'no Ollama Cloud connector configured',
        latencyMs: Date.now() - startedAt,
      };
    }

    const prompt = request.repairHint
      ? `${request.prompt}\n\n${request.repairHint}`
      : request.prompt;

    try {
      const response = await httpRequest<OllamaChatResponse>({
        url: `${baseUrl}${OLLAMA_CHAT_PATH}`,
        method: 'POST',
        headers: { Authorization: `Bearer ${credential.apiKey}` },
        body: {
          model: request.providerModelId,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          // Ollama enforces JSON at the decoder rather than by instruction.
          format: OLLAMA_JSON_FORMAT,
          think: false,
          options: {
            temperature: ROUTER_TEMPERATURE,
            num_predict: ROUTER_MAX_OUTPUT_TOKENS,
          },
        },
        timeoutMs: Math.max(0, request.timeoutMs - resolveMs),
      });

      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        return failureFromHttpStatus(response.status, response.data, latencyMs);
      }

      const content = response.data.message?.content ?? '';
      if (content.length === 0) {
        return emptyContentFailure(latencyMs);
      }

      return {
        ok: true,
        raw: content,
        latencyMs,
        inputTokens: response.data.prompt_eval_count ?? null,
        outputTokens: response.data.eval_count ?? null,
      };
    } catch (error: unknown) {
      return failureFromThrown(error, Date.now() - startedAt);
    }
  }
}
