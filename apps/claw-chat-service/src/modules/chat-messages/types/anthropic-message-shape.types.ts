import type { ANTHROPIC_USAGE_FIELDS } from '../constants/anthropic-native-transport.constants';

// Anthropic native Messages API content blocks. The wire format is documented
// at https://docs.anthropic.com/en/api/messages — each user/assistant message
// carries a `content` array of typed blocks (text / image / document). PDFs ride
// in `document` blocks with `media_type: 'application/pdf'` and a base64 source;
// other images ride in `image` blocks with their original mime type.
//
// Discriminated union on `type` so callers can `switch` over the shape safely.

export type AnthropicTextBlock = {
  type: 'text';
  text: string;
};

export type AnthropicBase64Source = {
  type: 'base64';
  media_type: string;
  data: string;
};

export type AnthropicImageBlock = {
  type: 'image';
  source: AnthropicBase64Source;
};

export type AnthropicDocumentBlock = {
  type: 'document';
  source: AnthropicBase64Source;
};

// Native tool calling. A tool *call* is an assistant-turn block; a tool
// *result* is a USER-turn block — Anthropic has no `tool` role, which is the
// single most common way to get a 400 on this API.
export type AnthropicToolUseContentBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AnthropicToolResultContentBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error: boolean;
};

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicDocumentBlock
  | AnthropicToolUseContentBlock
  | AnthropicToolResultContentBlock;

// Reason codes for an OpenAI image_url part that could not be transformed
// into an Anthropic block (malformed data URL, empty payload, non-data URL).
export type AnthropicMessageShapeWarningReason =
  'MALFORMED_DATA_URL' | 'NON_DATA_URL_IMAGE' | 'EMPTY_IMAGE_PAYLOAD';

export type AnthropicMessageShapeWarning = {
  reason: AnthropicMessageShapeWarningReason;
  detail: string;
};

export type AnthropicMessage = {
  role: string;
  content: string | AnthropicContentBlock[];
};

export type AnthropicMessageShapeResult = {
  messages: AnthropicMessage[];
  pdfCount: number;
  imageCount: number;
  warnings: AnthropicMessageShapeWarning[];
};

// Internal per-message transform result used by the single-message helper.
export type AnthropicSingleMessageTransformResult = {
  message: AnthropicMessage;
  pdfCount: number;
  imageCount: number;
};

// Internal per-part transform result used by the per-part helper.
export type AnthropicBuiltBlock = {
  block: AnthropicContentBlock;
  pdfDelta: number;
  imageDelta: number;
};

// Prompt-cache breakpoint (F093). `ephemeral` is the only type Anthropic
// accepts; the TTL is left at the provider default (5 minutes) on purpose — the
// 1-hour TTL doubles the write premium and nothing here has measured it paying
// back.
export type AnthropicCacheControl = {
  type: 'ephemeral';
};

// A `system` entry in block form — the only form that can carry a breakpoint.
export type AnthropicSystemTextBlock = {
  type: 'text';
  text: string;
  cache_control?: AnthropicCacheControl;
};

// One content block of a Messages API response. Only the fields the transport
// reads are typed; tool_use / redacted_thinking blocks are carried as `type`.
export type AnthropicResponseBlock = {
  type: string;
  text?: string;
  thinking?: string;
};

// Messages API response (non-streaming). `usage` stays `unknown` on purpose:
// it is handed to the shared `extractAnthropicUsage`, which is the one reader
// of Anthropic's usage fields (input_tokens EXCLUDES the cache counters).
export type AnthropicMessagesResponse = {
  id?: string;
  content?: AnthropicResponseBlock[];
  stop_reason?: string | null;
  usage?: unknown;
};

// What a buffered Messages response says, with thinking separated from the answer.
export type AnthropicMessageContent = {
  text: string;
  reasoning: string;
  finishReason: string;
  /** False when the response carried no `content` array at all. */
  hasContent: boolean;
};

// One of the usage counters named in ANTHROPIC_USAGE_FIELDS.
export type AnthropicUsageField = (typeof ANTHROPIC_USAGE_FIELDS)[number];
