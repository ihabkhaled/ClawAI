import { Logger } from '@nestjs/common';

import type {
  ChatInternalResponse,
  CloudGenerateInput,
  CloudGenerateOutput,
} from '../types/ai-action.types';

const logger = new Logger('CloudGenerationClient');

/**
 * Every paid provider call this service makes goes through here.
 *
 * PAYG METERING IS NOT DONE IN THIS SERVICE, ON PURPOSE. The reservation is
 * taken inside chat-service's `POST /internal/chat/generate`, immediately around
 * the provider request it owns. Wrapping a second `PaygMeter.reserve` around
 * this fetch would place TWO holds on one provider call and settle both —
 * charging the user twice for one answer, which is the failure mode the whole
 * "one reservation, not two" decision (D5) exists to prevent.
 *
 * What this service is responsible for is telling chat-service WHOSE credit to
 * spend and WHICH surface spent it. Both travel in the body; neither has a
 * default, because a defaulted `userId` charges the wrong wallet and a defaulted
 * surface makes the spend anonymous on the billing page.
 *
 * A 402 from chat-service arrives here as a non-ok response and is thrown like
 * any other upstream failure; each caller surfaces it in its own vocabulary.
 */
export async function callCloudGenerate(input: CloudGenerateInput): Promise<CloudGenerateOutput> {
  const url = `${input.chatServiceUrl}/api/v1/internal/chat/generate`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: input.provider,
        model: input.model,
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        userId: input.userId,
        surface: input.surface,
      }),
      signal: controller.signal,
    });
    const bodyText = await response.text();
    if (!response.ok) {
      logger.warn(
        `callCloudGenerate: HTTP ${String(response.status)} provider=${input.provider} surface=${input.surface} body=${bodyText.slice(0, 300)}`,
      );
      throw new Error(
        `Cloud generation failed (HTTP ${String(response.status)}): ${bodyText.slice(0, 200)}`,
      );
    }
    const parsed = JSON.parse(bodyText) as ChatInternalResponse;
    if (parsed.content.trim().length === 0) {
      throw new Error(`Cloud generation returned empty content from ${input.provider}`);
    }
    return {
      content: parsed.content,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
    };
  } finally {
    clearTimeout(timer);
  }
}
