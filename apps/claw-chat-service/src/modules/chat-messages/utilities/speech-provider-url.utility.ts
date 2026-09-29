import { SpeechProvider } from '../../../common/enums';
import {
  GEMINI_OPENAI_COMPAT_SUFFIX,
  GEMINI_TTS_BASE_URL,
  OPENAI_SPEECH_DEFAULT_BASE_URL,
  OPENAI_SPEECH_PATH,
} from '../constants/speech.constants';

function trimTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') {
    end -= 1;
  }
  return url.slice(0, end);
}

/**
 * The API base a speech call goes to: the connector's configured `baseUrl`
 * when set (blank = unset), else the provider's default host. A Gemini
 * connector points at the OpenAI-compatible `…/openai` path; speech needs the
 * native API above it, so that suffix is dropped — the same rule chat
 * completions apply for native Gemini calls.
 */
export function speechProviderBaseUrl(
  provider: SpeechProvider,
  connectorBaseUrl: string | null | undefined,
): string {
  const configured = trimTrailingSlashes(connectorBaseUrl?.trim() ?? '');
  if (provider === SpeechProvider.OPENAI) {
    return configured.length > 0 ? configured : OPENAI_SPEECH_DEFAULT_BASE_URL;
  }
  if (configured.length === 0) {
    return GEMINI_TTS_BASE_URL;
  }
  return configured.endsWith(GEMINI_OPENAI_COMPAT_SUFFIX)
    ? configured.slice(0, -GEMINI_OPENAI_COMPAT_SUFFIX.length)
    : configured;
}

/** OpenAI `/audio/speech` under the resolved base. */
export function openAiSpeechUrl(base: string): string {
  return `${base}${OPENAI_SPEECH_PATH}`;
}

/** Gemini native `generateContent` for one model under the resolved base. */
export function geminiSpeechUrl(base: string, model: string): string {
  return `${base}/models/${encodeURIComponent(model)}:generateContent`;
}
