import { Injectable, Logger } from "@nestjs/common";
import { AppConfig } from "../../../app/config/app.config";
import { httpRequest } from "../../../common/utilities";
import {
  EXTRACTION_PROMPT,
  VALID_MEMORY_TYPES,
  extractionResultSchema,
} from "../../../common/constants";
import { type MemoryType } from "../../../generated/prisma";
import type { ExtractedMemory, OllamaGenerateResponse } from "../types/memory.types";

@Injectable()
export class MemoryExtractionManager {
  private readonly logger = new Logger(MemoryExtractionManager.name);

  async extract(
    userMessage: string,
    assistantResponse: string,
  ): Promise<ExtractedMemory[]> {
    try {
      const config = AppConfig.get();

      const prompt = EXTRACTION_PROMPT
        .replace("{userMessage}", userMessage.slice(0, 500))
        .replace("{assistantResponse}", assistantResponse.slice(0, 1000));

      const response = await httpRequest<OllamaGenerateResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: "POST",
        body: {
          model: config.MEMORY_EXTRACTION_MODEL,
          prompt,
          stream: false,
          options: { temperature: 0, num_predict: 500 },
        },
        timeoutMs: 10_000,
      });

      if (!response.ok) {
        this.logger.warn(`Ollama extraction returned status ${String(response.status)}`);
        return [];
      }

      return this.parseResponse(response.data.response);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Memory extraction failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private parseResponse(raw: string): ExtractedMemory[] {
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const validated = extractionResultSchema.safeParse(parsed);

      if (!validated.success) {
        this.logger.warn(`Extraction response failed validation: ${validated.error.message}`);
        return [];
      }

      return validated.data
        .filter((item) => VALID_MEMORY_TYPES.has(item.type))
        .slice(0, 3)
        .map((item) => ({
          type: item.type as MemoryType,
          content: item.content,
        }));
    } catch {
      this.logger.warn("Extraction response is not valid JSON");
      return [];
    }
  }
}
