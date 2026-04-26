import { Logger } from '@nestjs/common';

import type {
  ChatInternalResponse,
  CloudGenerateInput,
  CloudGenerateOutput,
} from '../types/ai-action.types';

const logger = new Logger('CloudGenerationClient');

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
      }),
      signal: controller.signal,
    });
    const bodyText = await response.text();
    if (!response.ok) {
      logger.warn(
        `callCloudGenerate: HTTP ${String(response.status)} provider=${input.provider} body=${bodyText.slice(0, 300)}`,
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
