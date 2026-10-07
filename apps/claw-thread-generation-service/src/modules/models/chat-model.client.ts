import { PaygSurface } from '@claw/shared-types';
import { assertSafeRequestUrl, declaredHost, estimateTextTokens } from '@claw/shared-utilities';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';

import { AppConfig } from '../../app/config/app.config';
import { checkRoleContextFit } from '../generation/utilities/context-fit.utility';
import { ModelContextClient } from './model-context.client';

const modelResponseSchema = z.object({
  content: z.string().min(1),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().nonnegative().optional(),
  outputTokens: z.number().nonnegative().optional(),
  durationMs: z.number().nonnegative(),
  clamped: z.boolean(),
});

export type ChatModelRequest = {
  ownerId: string;
  requestId: string;
  budgetId: string;
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
};

const gatewayErrorSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]{2,59}$/u)
    .optional(),
});

export type ChatModelResponse = z.infer<typeof modelResponseSchema>;

@Injectable()
export class ChatModelClient {
  constructor(private readonly modelContext: ModelContextClient) {}

  async generate(input: ChatModelRequest): Promise<ChatModelResponse> {
    const promptTokens = estimateTextTokens(`${input.systemPrompt}\n${input.userPrompt}`);
    const contextWindowTokens = await this.modelContext.getWindow(input.provider, input.model);
    const contextFit = checkRoleContextFit({
      provider: input.provider,
      model: input.model,
      promptTokens,
      outputReserveTokens: input.maxOutputTokens,
      knownWindowTokens: contextWindowTokens,
    });
    if (!contextFit.fits) {
      throw new ServiceUnavailableException('Complete role context exceeds the model window');
    }

    const config = AppConfig.get();
    const url = `${config.CHAT_SERVICE_URL}/api/v1/internal/chat/generate`;
    assertSafeRequestUrl(url, declaredHost(config.CHAT_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          'x-request-id': input.requestId,
        },
        body: JSON.stringify({
          userId: input.ownerId,
          requestId: input.requestId,
          threadJobBudgetId: input.budgetId,
          surface: PaygSurface.THREADS,
          provider: input.provider,
          model: input.model,
          systemPrompt: input.systemPrompt,
          userPrompt: input.userPrompt,
          maxTokens: input.maxOutputTokens,
          workflow: 'threads_generation',
        }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch {
      throw new ServiceUnavailableException('Chat model gateway is unavailable');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Chat model request failed (${String(response.status)}${await describeGatewayError(response)})`,
      );
    }
    const parsed = modelResponseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.clamped) {
      throw new ServiceUnavailableException('Chat model response was incomplete');
    }
    return parsed.data;
  }
}

// Only a machine code (e.g. CLOUD_PROVIDER_EMPTY_RESPONSE) is kept: upstream free text
// could echo provider output, so it is dropped before it reaches an exception or a log.
async function describeGatewayError(response: Response): Promise<string> {
  const parsed = gatewayErrorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success && parsed.data.code ? `: ${parsed.data.code}` : '';
}
