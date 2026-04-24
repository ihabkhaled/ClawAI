import { Logger } from '@nestjs/common';

import type {
  OllamaGenerateInput,
  OllamaGenerateOutput,
  RawGenerateResponse,
} from '../types/ai-action.types';

const logger = new Logger('OllamaGenerationClient');

export async function callOllamaGenerate(
  input: OllamaGenerateInput,
): Promise<OllamaGenerateOutput> {
  const url = `${input.baseUrl}/api/v1/ollama/generate`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: input.model, prompt: input.prompt, stream: false }),
      signal: controller.signal,
    });
    const bodyText = await response.text();
    if (!response.ok) {
      logger.warn(
        `callOllamaGenerate: HTTP ${String(response.status)} — model=${input.model} body=${bodyText.slice(0, 500)}`,
      );
      throw new Error(
        `Ollama generation failed (HTTP ${String(response.status)}): ${bodyText.slice(0, 300)}`,
      );
    }
    const parsed = JSON.parse(bodyText) as RawGenerateResponse;
    const content = (parsed.response ?? '').trim();
    if (content.length === 0) {
      throw new Error('Ollama generation returned empty response');
    }
    const totalDurationNs = parsed.totalDuration ?? parsed.total_duration ?? 0;
    const wallMs = Date.now() - started;
    return {
      content,
      totalDurationMs: totalDurationNs > 0 ? Math.floor(totalDurationNs / 1_000_000) : wallMs,
      promptEvalCount: parsed.promptEvalCount ?? parsed.prompt_eval_count,
      evalCount: parsed.evalCount ?? parsed.eval_count,
    };
  } finally {
    clearTimeout(timer);
  }
}
