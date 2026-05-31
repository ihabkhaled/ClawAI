// Transforms OpenAI-shaped chat messages (the canonical context shape produced
// by ContextAssemblyManager.buildChatMessages) into the native Anthropic
// Messages API shape.
//
// Anthropic's native Messages API expects each message's `content` to be either
// a plain string OR an array of typed blocks: text / image / document. PDFs MUST
// ride in `document` blocks with `media_type: 'application/pdf'` — they are
// silently dropped if passed as `image` blocks. Other binary images travel as
// `image` blocks with their original mime type.
//
// Pure function: no I/O, no logger. Callers may log how many PDFs / images were
// transformed; this utility just maps shapes.

import type { OpenAiChatMessage, OpenAiContentPart } from '../types/execution.types';
import type {
  AnthropicBuiltBlock,
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicMessageShapeResult,
  AnthropicMessageShapeWarning,
  AnthropicSingleMessageTransformResult,
} from '../types/anthropic-message-shape.types';
import {
  ANTHROPIC_BASE64_SOURCE_TYPE,
  ANTHROPIC_DOCUMENT_BLOCK_TYPE,
  ANTHROPIC_IMAGE_BLOCK_TYPE,
  ANTHROPIC_PDF_MEDIA_TYPE,
  ANTHROPIC_TEXT_BLOCK_TYPE,
  DATA_URL_BASE64_PATTERN,
} from '../constants/anthropic-message-shape.constants';

export type {
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicMessageShapeResult,
  AnthropicMessageShapeWarning,
  AnthropicMessageShapeWarningReason,
} from '../types/anthropic-message-shape.types';

export function transformOpenAiMessagesToAnthropic(
  source: OpenAiChatMessage[],
): AnthropicMessageShapeResult {
  const messages: AnthropicMessage[] = [];
  const warnings: AnthropicMessageShapeWarning[] = [];
  let pdfCount = 0;
  let imageCount = 0;

  for (const original of source) {
    const transformed = transformSingleMessage(original, warnings);
    pdfCount += transformed.pdfCount;
    imageCount += transformed.imageCount;
    messages.push(transformed.message);
  }

  return { messages, pdfCount, imageCount, warnings };
}

function transformSingleMessage(
  source: OpenAiChatMessage,
  warnings: AnthropicMessageShapeWarning[],
): AnthropicSingleMessageTransformResult {
  if (typeof source.content === 'string') {
    return {
      message: { role: source.role, content: source.content },
      pdfCount: 0,
      imageCount: 0,
    };
  }

  const blocks: AnthropicContentBlock[] = [];
  let pdfCount = 0;
  let imageCount = 0;

  for (const part of source.content) {
    const built = buildBlockForPart(part, warnings);
    if (built === null) {
      continue;
    }
    blocks.push(built.block);
    pdfCount += built.pdfDelta;
    imageCount += built.imageDelta;
  }

  return {
    message: { role: source.role, content: blocks },
    pdfCount,
    imageCount,
  };
}

function buildBlockForPart(
  part: OpenAiContentPart,
  warnings: AnthropicMessageShapeWarning[],
): AnthropicBuiltBlock | null {
  if (part.type === 'text') {
    if (part.text.length === 0) {
      return null;
    }
    return {
      block: { type: ANTHROPIC_TEXT_BLOCK_TYPE, text: part.text },
      pdfDelta: 0,
      imageDelta: 0,
    };
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

  const effectiveMediaType = mediaType.length > 0 ? mediaType : 'application/octet-stream';
  if (effectiveMediaType.toLowerCase() === ANTHROPIC_PDF_MEDIA_TYPE) {
    return {
      block: {
        type: ANTHROPIC_DOCUMENT_BLOCK_TYPE,
        source: {
          type: ANTHROPIC_BASE64_SOURCE_TYPE,
          media_type: ANTHROPIC_PDF_MEDIA_TYPE,
          data: payload,
        },
      },
      pdfDelta: 1,
      imageDelta: 0,
    };
  }

  return {
    block: {
      type: ANTHROPIC_IMAGE_BLOCK_TYPE,
      source: {
        type: ANTHROPIC_BASE64_SOURCE_TYPE,
        media_type: effectiveMediaType,
        data: payload,
      },
    },
    pdfDelta: 0,
    imageDelta: 1,
  };
}
