import { ModelKind } from '../../../generated/prisma';
import {
  GEMINI_CHAT_METHOD,
  GEMINI_EMBEDDING_METHODS,
} from '../constants/gemini-model-kind.constants';

/**
 * What Google says a Gemini model is, from its `supportedGenerationMethods`.
 * `CHAT` means "no objection from the method list": a chat-capable model, or
 * an unreadable native list (so an outage cannot hide real chat models). The
 * id-based classifier still applies on top of this at write time.
 * Embedding methods mean EMBEDDING; anything else (aqa's `generateAnswer`,
 * Imagen `predict`) is TOOL. Neither is reachable from the chat picker.
 */
export function classifyGeminiModelKind(methods: readonly string[] | undefined): ModelKind {
  const chatOrUnknown =
    methods === undefined || methods.length === 0 || methods.includes(GEMINI_CHAT_METHOD);
  const embeds = methods?.some((method) => GEMINI_EMBEDDING_METHODS.includes(method)) ?? false;
  if (chatOrUnknown) return ModelKind.CHAT;
  return embeds ? ModelKind.EMBEDDING : ModelKind.TOOL;
}

/** Narrows Google's untyped `supportedGenerationMethods` to strings. */
export function readGenerationMethods(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}
