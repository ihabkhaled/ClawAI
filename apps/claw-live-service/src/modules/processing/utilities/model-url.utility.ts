import { GEMINI_OPENAI_COMPAT_SUFFIX } from '../constants/processing.constants';

/** Gemini's OpenAI-compatible surface lives under `/openai` of the connector's base URL. */
export function openAiCompatBase(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/u, '');
  return trimmed.endsWith(GEMINI_OPENAI_COMPAT_SUFFIX)
    ? trimmed
    : `${trimmed}${GEMINI_OPENAI_COMPAT_SUFFIX}`;
}

/** Ollama's native chat API lives under `/api`. */
export function ollamaBase(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/u, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
