import { isMediaOutputModel } from '../media-output-model';
import {
  MEDIA_TOOL_EXCLUDED_PROVIDERS,
  NON_CHAT_TOOL_MODEL_PATTERN,
  TOOL_DIALECT_PROVIDERS,
} from './tool-dialect-provider.constants';

/** Whether the provider has a native tool dialect (the tool loop can drive its models). */
export function providerHasToolDialect(provider: string): boolean {
  const key = provider.trim();
  return TOOL_DIALECT_PROVIDERS.has(key) || TOOL_DIALECT_PROVIDERS.has(key.toUpperCase());
}

/**
 * The ONE predicate for "this picked model can call chat-service's media tools": the
 * provider has a tool dialect AND the id is a chat model (not an embedding, a media
 * generator, a realtime or agent-only endpoint). The registry `supports_tools` column is
 * not consulted: it is unpopulated for most synced models (grok-4.20-* were FALSE).
 */
export function modelCanCallMediaTools(provider: string, model: string): boolean {
  const id = model.trim().replace(/^models\//u, '');
  return (
    providerHasToolDialect(provider) &&
    !MEDIA_TOOL_EXCLUDED_PROVIDERS.has(provider.trim()) &&
    !isMediaOutputModel(id, provider) &&
    !NON_CHAT_TOOL_MODEL_PATTERN.test(id)
  );
}
