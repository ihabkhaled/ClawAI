import { Injectable, Logger } from '@nestjs/common';
import { RouterErrorCode } from '../../../common/enums';
import { httpRequest } from '../../../common/utilities';
import { RouterProvider } from '../../../generated/prisma';
import {
  GEMINI_MINIMAL_THINKING_BUDGET,
  OPENAI_COMPATIBLE_CHAT_PATH,
  ROUTER_MAX_OUTPUT_TOKENS,
  ROUTER_TEMPERATURE,
} from '../constants/router-adapter.constants';
import { ConnectorCredentialService } from '../services/connector-credential.service';
import type { OpenAiCompatibleResponse } from '../types/router-adapter.types';
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
 * Router inference through Gemini's OpenAI-compatible surface.
 *
 * The compatible endpoint is used rather than native `:generateContent` because
 * connector-service already stores that base URL, and because the response
 * shape is then identical to every other OpenAI-compatible provider — which
 * keeps this adapter to translation only.
 *
 * It does no retrying and no fallback. Those are the coordinator's, so their
 * behaviour is proven once instead of once per provider.
 */
@Injectable()
export class GeminiRouterAdapter implements RouterInferenceProvider {
  readonly provider = RouterProvider.GEMINI;
  private readonly logger = new Logger(GeminiRouterAdapter.name);

  constructor(private readonly credentials: ConnectorCredentialService) {}

  async invoke(request: RouterInferenceRequest): Promise<RouterInferenceResponse> {
    const startedAt = Date.now();
    const credential = await this.credentials.resolve(this.provider);

    if (!credential?.baseUrl) {
      // A missing credential is an auth failure, not a transport one: retrying
      // cannot conjure a key, and the coordinator must skip the provider rather
      // than spend the entry's retry budget on it.
      this.logger.warn('invoke: no Gemini credential configured');
      return {
        ok: false,
        code: RouterErrorCode.AUTHENTICATION_FAILED,
        safeMessage: 'no Gemini connector configured',
        latencyMs: Date.now() - startedAt,
      };
    }

    const prompt = request.repairHint
      ? `${request.prompt}\n\n${request.repairHint}`
      : request.prompt;

    try {
      const response = await httpRequest<OpenAiCompatibleResponse>({
        url: `${credential.baseUrl}${OPENAI_COMPATIBLE_CHAT_PATH}`,
        method: 'POST',
        headers: { Authorization: `Bearer ${credential.apiKey}` },
        body: {
          model: request.providerModelId,
          messages: [{ role: 'user', content: prompt }],
          temperature: ROUTER_TEMPERATURE,
          max_tokens: ROUTER_MAX_OUTPUT_TOKENS,
          // Ask for JSON at the protocol level rather than trusting the prompt.
          response_format: { type: 'json_object' },
          reasoning_effort: GEMINI_MINIMAL_THINKING_BUDGET,
        },
        timeoutMs: request.timeoutMs,
      });

      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        return failureFromHttpStatus(response.status, response.data, latencyMs);
      }

      const content = response.data.choices?.[0]?.message?.content ?? '';
      if (content.length === 0) {
        return emptyContentFailure(latencyMs);
      }

      return {
        ok: true,
        raw: content,
        latencyMs,
        inputTokens: response.data.usage?.prompt_tokens ?? null,
        outputTokens: response.data.usage?.completion_tokens ?? null,
      };
    } catch (error: unknown) {
      return failureFromThrown(error, Date.now() - startedAt);
    }
  }
}
