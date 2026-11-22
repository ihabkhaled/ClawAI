import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { HttpMethod, PaygSurface } from '@claw/shared-types';
import { declaredHost, httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import {
  CHAT_GENERATE_PATH,
  CHAT_GENERATE_TIMEOUT_MS,
  ENHANCE_MAX_OUTPUT_TOKENS,
  ENHANCE_WORKFLOW,
  PASS_THROUGH_STATUSES,
} from '../constants/enhance.constants';
import { generateResponseSchema } from '../schemas/enhance.schema';
import type { GenerateRequest, GenerateResult } from '../types/enhance.types';

/**
 * The user-billed model call: chat-service `POST /api/v1/internal/chat/generate`. It charges the
 * caller's own wallet (PAYG) under the LIVE_INTELLIGENCE surface and settles by `requestId`.
 */
@Injectable()
export class EnhanceModelClient {
  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const base = AppConfig.get().CHAT_SERVICE_URL;
    const response = await httpRequest<unknown>({
      url: `${base}${CHAT_GENERATE_PATH}`,
      method: HttpMethod.POST,
      headers: { Authorization: `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}` },
      timeoutMs: CHAT_GENERATE_TIMEOUT_MS,
      allowedHosts: declaredHost(base),
      body: {
        userId: request.userId,
        requestId: request.requestId,
        surface: PaygSurface.LIVE_INTELLIGENCE,
        provider: request.provider,
        model: request.model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        maxTokens: ENHANCE_MAX_OUTPUT_TOKENS,
        workflow: ENHANCE_WORKFLOW,
      },
    });
    if (!response.ok) {
      if (PASS_THROUGH_STATUSES.has(response.status)) {
        throw new HttpException(LiveHistoryErrorCode.ENHANCE_FAILED, response.status);
      }
      throw new BadGatewayException(LiveHistoryErrorCode.ENHANCE_FAILED);
    }
    const parsed = generateResponseSchema.safeParse(response.data);
    if (!parsed.success) throw new BadGatewayException(LiveHistoryErrorCode.ENHANCE_FAILED);
    return { content: parsed.data.content, costMicroUsd: parsed.data.costMicroUsd ?? 0 };
  }
}
