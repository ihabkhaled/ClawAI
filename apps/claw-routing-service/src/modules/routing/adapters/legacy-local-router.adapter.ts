import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import { RouterProvider } from '../../../generated/prisma';
import {
  OLLAMA_LOCAL_GENERATE_PATH,
  ROUTER_MAX_OUTPUT_TOKENS,
  ROUTER_TEMPERATURE,
} from '../constants/router-adapter.constants';
import type { OllamaGenerateProxyResponse } from '../types/router-adapter.types';
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

/**
 * The existing local Ollama router, wrapped in the provider port.
 *
 * This is the rollback path. The pack requires the legacy behaviour to stay
 * reachable until shadow and canary evidence supports removing it, and putting
 * it behind the same interface means "roll back to local" is a configuration
 * change — reordering the chain — rather than a deploy.
 *
 * It talks to ollama-service, which fronts the local runtime, so no connector
 * credential is involved and nothing leaves the host.
 */
@Injectable()
export class LegacyLocalRouterAdapter implements RouterInferenceProvider {
  readonly provider = RouterProvider.OLLAMA;
  private readonly logger = new Logger(LegacyLocalRouterAdapter.name);

  async invoke(request: RouterInferenceRequest): Promise<RouterInferenceResponse> {
    const startedAt = Date.now();
    const config = AppConfig.get();
    const prompt = request.repairHint
      ? `${request.prompt}\n\n${request.repairHint}`
      : request.prompt;

    this.logger.debug(`invoke: local router model=${request.providerModelId}`);

    try {
      const response = await httpRequest<OllamaGenerateProxyResponse>({
        url: `${config.OLLAMA_SERVICE_URL}${OLLAMA_LOCAL_GENERATE_PATH}`,
        method: 'POST',
        body: {
          model: request.providerModelId,
          prompt,
          stream: false,
          think: false,
          keepAlive: config.OLLAMA_KEEP_ALIVE,
          options: {
            temperature: ROUTER_TEMPERATURE,
            num_predict: ROUTER_MAX_OUTPUT_TOKENS,
          },
        },
        timeoutMs: request.timeoutMs,
      });

      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        return failureFromHttpStatus(response.status, response.data, latencyMs);
      }

      const content = response.data.response ?? '';
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
