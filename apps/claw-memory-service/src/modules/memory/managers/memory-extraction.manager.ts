import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  EXTRACTION_PROMPT,
  extractionResultSchema,
  VALID_MEMORY_TYPES,
} from '../../../common/constants';
import { type MemoryType } from '../../../generated/prisma';
import type { ExtractedMemory, OllamaGenerateResponse } from '../types/memory.types';

@Injectable()
export class MemoryExtractionManager {
  private readonly logger = new Logger(MemoryExtractionManager.name);

  async extract(userMessage: string, assistantResponse: string): Promise<ExtractedMemory[]> {
    this.logger.log(
      `extract: starting memory extraction from conversation (userMsgLen=${String(userMessage.length)}, assistantLen=${String(assistantResponse.length)})`,
    );
    try {
      const config = AppConfig.get();
      const model = await this.resolveModel(
        config.MEMORY_EXTRACTION_MODEL,
        config.OLLAMA_SERVICE_URL,
      );

      this.logger.debug(`extract: building extraction prompt with model=${model}`);
      const prompt = EXTRACTION_PROMPT.replace('{userMessage}', userMessage.slice(0, 500)).replace(
        '{assistantResponse}',
        assistantResponse.slice(0, 1000),
      );
      this.logger.debug(`extract: prompt built — length=${String(prompt.length)} chars`);

      this.logger.debug(`extract: calling Ollama for extraction at ${config.OLLAMA_SERVICE_URL}`);
      const response = await httpRequest<OllamaGenerateResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model,
          prompt,
          stream: false,
          options: { temperature: 0, num_predict: 500 },
        },
        timeoutMs: 10_000,
      });

      if (!response.ok) {
        this.logger.warn(`extract: Ollama extraction returned status ${String(response.status)}`);
        return [];
      }

      this.logger.debug(
        `extract: Ollama response received — length=${String(response.data.response.length)} chars`,
      );
      const results = this.parseResponse(response.data.response);
      this.logger.log(`extract: extracted ${String(results.length)} memories`);
      return results;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`extract: memory extraction failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private parseResponse(raw: string): ExtractedMemory[] {
    this.logger.debug(`parseResponse: parsing extraction response (length=${String(raw.length)})`);
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.debug('parseResponse: no JSON array found in response');
        return [];
      }

      this.logger.debug('parseResponse: JSON array extracted — validating with schema');
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const validated = extractionResultSchema.safeParse(parsed);

      if (!validated.success) {
        this.logger.warn(`parseResponse: validation failed — ${validated.error.message}`);
        return [];
      }

      this.logger.debug(
        `parseResponse: validated ${String(validated.data.length)} items — filtering valid memory types`,
      );
      const filtered = validated.data
        .filter((item) => VALID_MEMORY_TYPES.has(item.type))
        .slice(0, 3)
        .map((item) => ({
          type: item.type as MemoryType,
          content: item.content,
        }));
      this.logger.debug(`parseResponse: ${String(filtered.length)} valid memories after filtering`);
      return filtered;
    } catch {
      this.logger.warn('parseResponse: extraction response is not valid JSON');
      return [];
    }
  }

  private async resolveModel(model: string, ollamaUrl: string): Promise<string> {
    if (model !== 'AUTO') {
      return model;
    }

    try {
      const response = await httpRequest<{
        models: Array<{
          name: string;
          tag: string;
          roles: string[];
          parameterCount: string | null;
          sizeBytes?: number | null;
        }>;
      }>({
        url: `${ollamaUrl}/api/v1/internal/ollama/installed-models`,
        method: 'GET',
        timeoutMs: 5_000,
      });

      if (!response.ok) {
        return 'AUTO';
      }

      const candidates = response.data.models.filter((entry) => !entry.roles.includes('ROUTER'));
      candidates.sort((a, b) => this.modelScore(a) - this.modelScore(b));
      const fallback =
        candidates.find((entry) => entry.roles.includes('LOCAL_REASONING')) ??
        candidates.find((entry) => entry.roles.includes('LOCAL_FALLBACK_CHAT')) ??
        candidates[0];

      return fallback ? `${fallback.name}:${fallback.tag}` : 'AUTO';
    } catch {
      return 'AUTO';
    }
  }

  private modelScore(model: { parameterCount: string | null; sizeBytes?: number | null }): number {
    if (
      model.sizeBytes !== null &&
      model.sizeBytes !== undefined &&
      Number.isFinite(model.sizeBytes)
    ) {
      return model.sizeBytes;
    }

    const normalized = (model.parameterCount ?? '').toLowerCase().replaceAll(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }
}
