import { LOCAL_SPEECH_API_PATH } from '../constants/transcription.constants';
import { normalizeBaseUrl } from './transcription-format.utility';

/**
 * The OpenAI-compatible API root of the local speech container, or `null`
 * when the operator blanked `LOCAL_SPEECH_BASE_URL` (blank = unset = the LOCAL
 * candidate is off). The `/v1` suffix is appended once: an operator who
 * already wrote it (a proxy in front) is not given `/v1/v1`.
 */
export function localSpeechApiBase(configured: string): string | null {
  const base = normalizeBaseUrl(configured.trim());
  if (base.length === 0) {
    return null;
  }
  return base.endsWith(LOCAL_SPEECH_API_PATH) ? base : `${base}${LOCAL_SPEECH_API_PATH}`;
}

/** The container's health URL: the server root, never under `/v1`. */
export function localSpeechHealthUrl(apiBase: string, healthPath: string): string {
  const root = apiBase.endsWith(LOCAL_SPEECH_API_PATH)
    ? apiBase.slice(0, -LOCAL_SPEECH_API_PATH.length)
    : apiBase;
  return `${root}${healthPath}`;
}
