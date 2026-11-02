import { Injectable, Logger } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import {
  GEMINI_DEFAULT_BASE_URL,
  GEMINI_OPENAI_COMPAT_SUFFIX,
  OLLAMA_CONNECTOR,
  OLLAMA_DEFAULT_BASE_URL,
  TRANSLATION_CONFIG_CACHE_MS,
  TRANSLATION_CONFIG_TIMEOUT_MS,
  TRANSLATION_CONNECTOR_CONFIG_PATH,
  TRANSLATION_MAX_OUTPUT_TOKENS,
  TRANSLATION_MODEL_CHAIN,
  TRANSLATION_MODEL_TIMEOUT_MS,
} from '../constants/publication-translation.constants';
import type { TranslationModelRef } from '../types/publication-translation.types';

const connectorConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().nullish(),
});

const openAiReplySchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

const ollamaReplySchema = z.object({ message: z.object({ content: z.string() }) });

type ConnectorConfig = { apiKey: string; baseUrl: string };

/** Why a translation call produced nothing; a code, never provider text. */
export class TranslationModelError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/**
 * One translation reply from a model that costs no credit. The platform pays, so the call goes
 * straight to the connector's provider with the connector's key and never through a user's wallet.
 * The chain is walked in order; the first model that answers wins.
 */
@Injectable()
export class TranslationModelClient {
  private readonly logger = new Logger(TranslationModelClient.name);
  private readonly configs = new Map<string, { value: ConnectorConfig; expiresAt: number }>();

  async complete(system: string, prompt: string): Promise<{ content: string; model: string }> {
    let lastCode = 'NO_MODEL_AVAILABLE';
    for (const ref of TRANSLATION_MODEL_CHAIN) {
      try {
        const content = await this.call(ref, system, prompt);
        if (content.trim() !== '') return { content, model: `${ref.connector}:${ref.model}` };
        lastCode = 'EMPTY_REPLY';
      } catch (error: unknown) {
        lastCode = error instanceof TranslationModelError ? error.code : 'MODEL_CALL_FAILED';
        this.logger.warn(`translation model ${ref.connector}:${ref.model} skipped: ${lastCode}`);
      }
    }
    throw new TranslationModelError(lastCode);
  }

  private async call(ref: TranslationModelRef, system: string, prompt: string): Promise<string> {
    const config = await this.configFor(ref.connector);
    const isOpenAi = ref.style === 'OPENAI_COMPAT';
    const base = isOpenAi ? openAiBase(config.baseUrl) : ollamaBase(config.baseUrl);
    const url = `${base}${isOpenAi ? '/chat/completions' : '/chat'}`;
    assertSafeRequestUrl(url, declaredHost(base));
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ];
    const body = isOpenAi
      ? { model: ref.model, messages, stream: false, max_tokens: TRANSLATION_MAX_OUTPUT_TOKENS }
      : {
          model: ref.model,
          messages,
          stream: false,
          think: false,
          options: { num_predict: TRANSLATION_MAX_OUTPUT_TOKENS },
        };
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TRANSLATION_MODEL_TIMEOUT_MS),
      });
    } catch {
      throw new TranslationModelError('MODEL_UNREACHABLE');
    }
    if (!response.ok) throw new TranslationModelError(`MODEL_HTTP_${String(response.status)}`);
    const json: unknown = await response.json().catch(() => null);
    if (isOpenAi) {
      const parsed = openAiReplySchema.safeParse(json);
      return parsed.success ? (parsed.data.choices[0]?.message.content ?? '') : '';
    }
    const parsed = ollamaReplySchema.safeParse(json);
    return parsed.success ? parsed.data.message.content : '';
  }

  private async configFor(connector: string): Promise<ConnectorConfig> {
    const cached = this.configs.get(connector);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const app = AppConfig.get();
    const url = `${app.CONNECTOR_SERVICE_URL}${TRANSLATION_CONNECTOR_CONFIG_PATH}?provider=${encodeURIComponent(connector)}`;
    assertSafeRequestUrl(url, declaredHost(app.CONNECTOR_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'error',
        headers: { Authorization: `Service ${app.INTER_SERVICE_AUTH_TOKEN}` },
        signal: AbortSignal.timeout(TRANSLATION_CONFIG_TIMEOUT_MS),
      });
    } catch {
      throw new TranslationModelError('CONNECTOR_UNREACHABLE');
    }
    if (!response.ok) throw new TranslationModelError('CONNECTOR_NOT_CONFIGURED');
    const parsed = connectorConfigSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new TranslationModelError('CONNECTOR_NOT_CONFIGURED');
    const value = {
      apiKey: parsed.data.apiKey,
      baseUrl:
        parsed.data.baseUrl ??
        (connector === OLLAMA_CONNECTOR ? OLLAMA_DEFAULT_BASE_URL : GEMINI_DEFAULT_BASE_URL),
    };
    this.configs.set(connector, { value, expiresAt: Date.now() + TRANSLATION_CONFIG_CACHE_MS });
    return value;
  }
}

/** Gemini's OpenAI-compatible surface lives under `/openai` of the connector's base URL. */
function openAiBase(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/u, '');
  return trimmed.endsWith(GEMINI_OPENAI_COMPAT_SUFFIX)
    ? trimmed
    : `${trimmed}${GEMINI_OPENAI_COMPAT_SUFFIX}`;
}

/** Ollama's native chat API lives under `/api`. */
function ollamaBase(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/u, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
