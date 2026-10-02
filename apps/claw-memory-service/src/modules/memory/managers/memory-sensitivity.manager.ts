import { Injectable, Logger } from '@nestjs/common';
import { MemorySensitivity } from '../../../generated/prisma';
import { SENSITIVITY_SOFT_HINTS } from '../../../common/constants/memory-sensitivity.constants';
import { maskSecrets } from '../../../common/utilities/mask-secrets.utility';
import {
  SENSITIVITY_CLASSIFIER_MAX_INPUT,
  SENSITIVITY_CLASSIFIER_PROMPT,
  SENSITIVITY_CLASSIFIER_TIMEOUT_MS,
} from '../../../common/constants/sensitivity-classifier.constants';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import { buildInterServiceAuthHeader } from '../../../common/utilities/inter-service-auth.utility';
import { classifierResponseSchema } from '../constants/sensitivity-classifier.constants';
import type { SensitivityVerdict } from '../types/memory-sensitivity.types';
import type { OllamaGenerateResponse } from '../types/memory.types';
import { CIRCUIT_OLLAMA_GENERATE } from '../../../common/constants';
import { throughCircuit } from '../../../common/utilities';

export type { SensitivityVerdict };

@Injectable()
export class MemorySensitivityManager {
  private readonly logger = new Logger(MemorySensitivityManager.name);

  classify(content: string): SensitivityVerdict {
    this.logger.debug(`classify: contentLen=${String(content.length)}`);
    // The WHOLE content is scanned and masked in place. This used to scan the
    // first 8K characters and return `slice(0, 256)` of the masked text as the
    // "preview" — which the create path then stored as the memory, so one
    // false positive turned a 45K-char spec into a stub ending "...Use".
    const { masked, matched: matchedNames } = maskSecrets(content);
    if (matchedNames.length > 0) {
      this.logger.warn(`classify: REDACTED — matched ${matchedNames.join(',')}`);
      return {
        verdict: MemorySensitivity.REDACTED,
        confidence: 1,
        reason: matchedNames[0] ?? null,
        redactedPreview: masked,
      };
    }
    const lowered = content.toLowerCase();
    const hits = SENSITIVITY_SOFT_HINTS.filter((hint) => lowered.includes(hint));
    if (hits.length > 0) {
      this.logger.debug(`classify: SENSITIVE — soft hints=${hits.join(',')}`);
      return {
        verdict: MemorySensitivity.SENSITIVE,
        confidence: Math.min(0.5 + 0.1 * hits.length, 0.9),
        reason: `Mentions: ${hits.slice(0, 5).join(', ')}`,
        redactedPreview: null,
      };
    }
    return {
      verdict: MemorySensitivity.NORMAL,
      confidence: 1,
      reason: null,
      redactedPreview: null,
    };
  }

  /**
   * Memory V2 — Ollama-backed verdict for content the regex pre-filter passes
   * as NORMAL. Returns the regex result if anything fails so persistence stays
   * unblocked.
   */
  async classifyWithOllama(content: string): Promise<SensitivityVerdict> {
    const regex = this.classify(content);
    if (regex.verdict !== MemorySensitivity.NORMAL) {
      return regex;
    }
    if (content.trim().length === 0) {
      return regex;
    }
    try {
      const config = AppConfig.get();
      const prompt = SENSITIVITY_CLASSIFIER_PROMPT.replace(
        '{content}',
        content.slice(0, SENSITIVITY_CLASSIFIER_MAX_INPUT),
      );
      // Same dead-dependency problem as extraction, same circuit: this runs on
      // the write path for every memory, and a missing model must cost one
      // timeout per half-minute rather than one per memory.
      const response = await throughCircuit(CIRCUIT_OLLAMA_GENERATE, async () =>
        httpRequest<OllamaGenerateResponse>({
          url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
          method: 'POST',
          headers: { Authorization: buildInterServiceAuthHeader() },
          body: {
            model: config.MEMORY_SENSITIVITY_MODEL,
            prompt,
            stream: false,
            options: { temperature: 0, num_predict: 120 },
          },
          timeoutMs: SENSITIVITY_CLASSIFIER_TIMEOUT_MS,
        }),
      );
      if (!response.ok) {
        this.logger.warn(
          `classifyWithOllama: status=${String(response.status)} — falling back to NORMAL`,
        );
        return regex;
      }
      return this.parseClassifierResponse(response.data.response, regex);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`classifyWithOllama: failed — ${msg}`);
      return regex;
    }
  }

  private parseClassifierResponse(raw: string, fallback: SensitivityVerdict): SensitivityVerdict {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return fallback;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return fallback;
    }
    const validated = classifierResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return fallback;
    }
    return validated.data.verdict === 'NORMAL'
      ? fallback
      : {
          verdict: validated.data.verdict as MemorySensitivity,
          confidence: validated.data.confidence,
          reason: validated.data.reason.length > 0 ? validated.data.reason : 'ollama_classifier',
          redactedPreview: null,
        };
  }
}
