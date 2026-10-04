import { CHAT_PATH_SUFFIX } from '../constants/chat-path.constants';

/** A chat path is a safe absolute path that ends with the OpenAI suffix. */
export function isValidChatCompletionsPath(path: string): boolean {
  return (
    path.endsWith(CHAT_PATH_SUFFIX) &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !path.includes('?')
  );
}

/**
 * chat-service always posts to `<baseUrl>/chat/completions`. A provider that
 * serves chat under a prefix (`/v1/chat/completions`) gets that prefix folded
 * into the base URL it is handed, so chat-service needs no per-provider path.
 */
export function chatBaseUrlWithPrefix(baseUrl: string, chatPath: string): string {
  const prefix = chatPath.slice(0, chatPath.length - CHAT_PATH_SUFFIX.length);
  return prefix.length === 0 ? baseUrl : `${baseUrl.replace(/\/+$/u, '')}${prefix}`;
}
