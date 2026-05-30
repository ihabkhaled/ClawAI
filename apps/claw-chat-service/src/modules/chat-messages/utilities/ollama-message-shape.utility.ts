// Transforms OpenAI-shaped chat messages (used as the canonical context shape
// by ContextAssemblyManager.buildChatMessages) into the native Ollama
// `/api/chat` message shape.
//
// Cloud-Ollama connectors expose the native /api/chat endpoint — it expects
// each message to have a string `content` plus an optional sibling
// `images: string[]` of raw base64 payloads (no `data:` URI prefix). Passing
// OpenAI-style `image_url` content parts to this endpoint causes images to be
// silently dropped, so we explicitly fan them out here.
//
// Pure function: no I/O, no logger. Callers may log how many images were
// transformed; this utility just maps shapes.

import type {
  OllamaChatMessage,
  OpenAiChatMessage,
  OpenAiContentPart,
} from '../types/execution.types';
import type {
  OllamaMessageShapeResult,
  OllamaMessageShapeWarning,
  OllamaSingleMessageTransformResult,
} from '../types/ollama-message-shape.types';
import { DATA_URL_BASE64_PATTERN } from '../constants/ollama-message-shape.constants';

export type {
  OllamaMessageShapeResult,
  OllamaMessageShapeWarning,
  OllamaMessageShapeWarningReason,
} from '../types/ollama-message-shape.types';

export function transformOpenAiMessagesToOllama(
  source: OpenAiChatMessage[],
): OllamaMessageShapeResult {
  const messages: OllamaChatMessage[] = [];
  const warnings: OllamaMessageShapeWarning[] = [];
  let imageCount = 0;

  for (const original of source) {
    const transformed = transformSingleMessage(original, warnings);
    imageCount += transformed.imageCount;
    messages.push(transformed.message);
  }

  return { messages, imageCount, warnings };
}

function transformSingleMessage(
  source: OpenAiChatMessage,
  warnings: OllamaMessageShapeWarning[],
): OllamaSingleMessageTransformResult {
  if (typeof source.content === 'string') {
    return { message: { role: source.role, content: source.content }, imageCount: 0 };
  }

  const textChunks: string[] = [];
  const images: string[] = [];

  for (const part of source.content) {
    appendPart(part, textChunks, images, warnings);
  }

  const message: OllamaChatMessage = {
    role: source.role,
    content: textChunks.join('\n'),
  };
  if (images.length > 0) {
    message.images = images;
  }
  return { message, imageCount: images.length };
}

function appendPart(
  part: OpenAiContentPart,
  textChunks: string[],
  images: string[],
  warnings: OllamaMessageShapeWarning[],
): void {
  if (part.type === 'text') {
    if (part.text.length > 0) {
      textChunks.push(part.text);
    }
    return;
  }

  const url = part.image_url.url;
  const match = DATA_URL_BASE64_PATTERN.exec(url);
  if (!match) {
    warnings.push({
      reason: url.startsWith('data:') ? 'MALFORMED_DATA_URL' : 'NON_DATA_URL_IMAGE',
      detail: `Image URL did not match data:*;base64,* pattern (prefix=${url.slice(0, 32)})`,
    });
    return;
  }

  const payload = match[1]?.trim() ?? '';
  if (payload.length === 0) {
    warnings.push({
      reason: 'EMPTY_IMAGE_PAYLOAD',
      detail: 'Base64 payload was empty after parsing data URL',
    });
    return;
  }

  images.push(payload);
}
