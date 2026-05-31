// Transforms OpenAI-shaped chat messages (the canonical context shape produced
// by ContextAssemblyManager.buildChatMessages) into the native Gemini
// generateContent request body.
//
// For each `image_url` part the builder decides between two encodings based on
// the configured size threshold:
//   - Small payloads (< threshold) → `inline_data` with base64 bytes.
//   - Large payloads (>= threshold) → upload to the Files API (via the caller-
//     injected upload function) and reference via `file_data: { file_uri }`.
//
// The upload function is injected so the manager that owns HTTP I/O + caching
// stays separable from this pure-ish builder. The builder still awaits the
// upload because each part's shape depends on the upload result, but it does
// no HTTP itself.

import type { OpenAiChatMessage, OpenAiContentPart } from '../types/execution.types';
import type {
  GeminiBuiltPart,
  GeminiContent,
  GeminiContentPart,
  GeminiFileUploadFn,
  GeminiRequestBody,
  GeminiRequestBuildResult,
  GeminiRequestShapeWarning,
  GeminiTransformedMessage,
} from '../types/gemini.types';
import {
  DATA_URL_BASE64_PATTERN,
  GEMINI_DEFAULT_BINARY_MIME_TYPE,
  GEMINI_ROLE_MODEL,
  GEMINI_ROLE_SYSTEM,
  GEMINI_ROLE_USER,
} from '../constants/gemini-files-api.constants';

export type {
  GeminiContent,
  GeminiContentPart,
  GeminiRequestBody,
  GeminiRequestBuildResult,
  GeminiRequestShapeWarning,
  GeminiFileUploadFn,
} from '../types/gemini.types';

export async function buildGeminiRequestBody(
  messages: OpenAiChatMessage[],
  fileUploadFn: GeminiFileUploadFn,
  sizeThreshold: number,
): Promise<GeminiRequestBuildResult> {
  const contents: GeminiContent[] = [];
  let systemInstructionText: string | null = null;
  const warnings: GeminiRequestShapeWarning[] = [];
  let inlineCount = 0;
  let fileDataCount = 0;

  for (const original of messages) {
    if (isSystemRole(original.role)) {
      const text = collectSystemText(original);
      if (text.length > 0) {
        systemInstructionText =
          systemInstructionText === null ? text : `${systemInstructionText}\n${text}`;
      }
      continue;
    }
    const transformed = await transformMessage(original, fileUploadFn, sizeThreshold, warnings);
    inlineCount += transformed.inlineDelta;
    fileDataCount += transformed.fileDataDelta;
    contents.push(transformed.content);
  }

  const body: GeminiRequestBody = { contents };
  if (systemInstructionText !== null) {
    body.systemInstruction = { parts: [{ text: systemInstructionText }] };
  }

  return { body, inlineCount, fileDataCount, warnings };
}

function isSystemRole(role: string): boolean {
  return role.toLowerCase() === GEMINI_ROLE_SYSTEM;
}

function collectSystemText(message: OpenAiChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

async function transformMessage(
  source: OpenAiChatMessage,
  fileUploadFn: GeminiFileUploadFn,
  sizeThreshold: number,
  warnings: GeminiRequestShapeWarning[],
): Promise<GeminiTransformedMessage> {
  const role = mapRoleToGemini(source.role);
  if (typeof source.content === 'string') {
    return {
      content: { role, parts: [{ text: source.content }] },
      inlineDelta: 0,
      fileDataDelta: 0,
    };
  }

  const parts: GeminiContentPart[] = [];
  let inlineDelta = 0;
  let fileDataDelta = 0;

  for (const part of source.content) {
    const built = await buildPart(part, fileUploadFn, sizeThreshold, warnings);
    if (built === null) {
      continue;
    }
    parts.push(built.part);
    inlineDelta += built.inlineDelta;
    fileDataDelta += built.fileDataDelta;
  }

  if (parts.length === 0) {
    parts.push({ text: '' });
  }
  return { content: { role, parts }, inlineDelta, fileDataDelta };
}

function mapRoleToGemini(role: string): string {
  const normalized = role.toLowerCase();
  if (normalized === 'assistant') {
    return GEMINI_ROLE_MODEL;
  }
  if (normalized === 'user') {
    return GEMINI_ROLE_USER;
  }
  return GEMINI_ROLE_USER;
}

async function buildPart(
  part: OpenAiContentPart,
  fileUploadFn: GeminiFileUploadFn,
  sizeThreshold: number,
  warnings: GeminiRequestShapeWarning[],
): Promise<GeminiBuiltPart | null> {
  if (part.type === 'text') {
    if (part.text.length === 0) {
      return null;
    }
    return { part: { text: part.text }, inlineDelta: 0, fileDataDelta: 0 };
  }

  const url = part.image_url.url;
  const match = DATA_URL_BASE64_PATTERN.exec(url);
  if (!match) {
    warnings.push({
      reason: url.startsWith('data:') ? 'MALFORMED_DATA_URL' : 'NON_DATA_URL_IMAGE',
      detail: `Image URL did not match data:<mime>;base64,<payload> (prefix=${url.slice(0, 32)})`,
    });
    return null;
  }

  const mediaType = (match[1] ?? '').trim();
  const payload = (match[2] ?? '').trim();
  if (payload.length === 0) {
    warnings.push({
      reason: 'EMPTY_IMAGE_PAYLOAD',
      detail: 'Base64 payload was empty after parsing data URL',
    });
    return null;
  }

  const effectiveMediaType = mediaType.length > 0 ? mediaType : GEMINI_DEFAULT_BINARY_MIME_TYPE;
  const decoded = Buffer.from(payload, 'base64');
  const sizeBytes = decoded.length;

  if (sizeBytes < sizeThreshold) {
    return {
      part: { inline_data: { mime_type: effectiveMediaType, data: payload } },
      inlineDelta: 1,
      fileDataDelta: 0,
    };
  }

  try {
    const fileUri = await fileUploadFn(decoded, effectiveMediaType);
    return {
      part: { file_data: { mime_type: effectiveMediaType, file_uri: fileUri } },
      inlineDelta: 0,
      fileDataDelta: 1,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown upload error';
    warnings.push({
      reason: 'FILE_UPLOAD_FAILED',
      detail: `Gemini Files API upload failed (${message}) — falling back to inline_data`,
    });
    return {
      part: { inline_data: { mime_type: effectiveMediaType, data: payload } },
      inlineDelta: 1,
      fileDataDelta: 0,
    };
  }
}
