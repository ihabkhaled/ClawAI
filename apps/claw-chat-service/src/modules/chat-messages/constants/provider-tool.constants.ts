import { ProviderToolDialect } from '../../../common/enums';
import {
  ANTHROPIC_PROVIDER,
  GEMINI_PROVIDER,
  LLAMACPP_CONNECTOR_PROVIDER,
  LLAMACPP_PROVIDER,
  OLLAMA_CONNECTOR_PROVIDER,
  OLLAMA_PROVIDER,
} from '../../../common/constants';

// Which wire dialect each provider speaks for native tool calling.
//
// GEMINI maps to OPENAI on purpose. Gemini's native `functionDeclarations`
// uses an OpenAPI subset that rejects `additionalProperties` and `maxLength` —
// both of which every Runtime V2 `inputSchema` carries — so a native Gemini
// tool path would need a schema-dialect converter. Its OpenAI-compatibility
// surface is already the default base URL, and it accepts the schemas as-is.
//
// AWS_BEDROCK maps to ANTHROPIC because the Bedrock connector fronts Anthropic
// models through the Messages API shape.
export const PROVIDER_TOOL_DIALECT_BY_PROVIDER: Readonly<Record<string, ProviderToolDialect>> = {
  OPENAI: ProviderToolDialect.OPENAI,
  [GEMINI_PROVIDER]: ProviderToolDialect.OPENAI,
  DEEPSEEK: ProviderToolDialect.OPENAI,
  GROK: ProviderToolDialect.OPENAI,
  [LLAMACPP_CONNECTOR_PROVIDER]: ProviderToolDialect.OPENAI,
  [LLAMACPP_PROVIDER]: ProviderToolDialect.OPENAI,
  [ANTHROPIC_PROVIDER]: ProviderToolDialect.ANTHROPIC,
  AWS_BEDROCK: ProviderToolDialect.ANTHROPIC,
  [OLLAMA_CONNECTOR_PROVIDER]: ProviderToolDialect.OLLAMA,
  [OLLAMA_PROVIDER]: ProviderToolDialect.OLLAMA,
};

// OpenAI's function-name charset. Anthropic and Ollama are equal or laxer, so
// satisfying this satisfies all three and keeps one name per tool across
// dialects — which matters because the reverse lookup is keyed on it.
export const NATIVE_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/u;

export const NATIVE_TOOL_NAME_ILLEGAL_PATTERN = /[^a-zA-Z0-9_-]/gu;

export const NATIVE_TOOL_NAME_MAX_LENGTH = 64;

export const NATIVE_TOOL_NAME_REPLACEMENT = '_';

// Runtime V2 bounds `toolResult.modelText` at 65 536 characters. Storing or
// echoing more than the model will ever see only inflates the transcript.
export const TOOL_RESULT_CONTENT_MAX_CHARS = 65_536;

export const TOOL_RESULT_TRUNCATION_MARKER = '\n…[tool result truncated]';

// Ollama frequently omits a tool-call id. One must be synthesized so the
// result message can be correlated on the next turn.
export const SYNTHETIC_TOOL_CALL_ID_PREFIX = 'call_';

export const PROVIDER_TOOL_SCHEMA_TYPE_OBJECT = 'object';

export const PROVIDER_TOOL_SCHEMA_TYPE_STRING = 'string';

export const PROVIDER_TOOL_FUNCTION_TYPE = 'function';

export const TOOL_OPERATION_PROPERTY = 'operation';

export const TOOL_TARGET_ID_PROPERTY = 'targetId';

export const TOOL_ARGUMENTS_PROPERTY = 'arguments';

export const ANTHROPIC_TOOL_USE_BLOCK_TYPE = 'tool_use';

export const ANTHROPIC_TOOL_RESULT_BLOCK_TYPE = 'tool_result';

export const ANTHROPIC_TEXT_BLOCK_TYPE = 'text';

export const OPENAI_TOOL_CHOICE_AUTO = 'auto';

export const OPENAI_TOOL_CHOICE_REQUIRED = 'required';

export const OPENAI_TOOL_CHOICE_NONE = 'none';

export const ANTHROPIC_TOOL_CHOICE_AUTO = 'auto';

// Anthropic spells "you must call something" as `any`, not `required`.
export const ANTHROPIC_TOOL_CHOICE_ANY = 'any';

export const ANTHROPIC_TOOL_CHOICE_NONE = 'none';

// Anthropic rejects a Messages request that carries `tools` without
// `max_tokens`. When the thread supplies no cap we must still send one.
export const ANTHROPIC_TOOL_DEFAULT_MAX_TOKENS = 8_192;

export const OPENAI_TOOL_CALLS_FINISH_REASON = 'tool_calls';

export const ROLE_ASSISTANT = 'assistant';

export const ROLE_TOOL = 'tool';

export const ROLE_USER = 'user';
