import { Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors';
import { httpRequest } from '../../../common/utilities';
import { OLLAMA_TOOL_RESULT_MAX_CHARS } from '../constants/agentic-loop.constants';
import {
  OLLAMA_CLOUD_TOOL_DEFINITIONS,
  TOOL_WEB_FETCH,
  TOOL_WEB_SEARCH,
} from '../constants/ollama-cloud-tools.constants';
import type {
  ExecuteOllamaCloudToolCallOptions,
  OllamaCloudToolCall,
} from '../types/ollama-cloud-tool.types';

export { OLLAMA_CLOUD_TOOL_DEFINITIONS };

const logger = new Logger('OllamaCloudToolRunner');

// Dispatches a single Ollama Cloud tool_call to its matching endpoint
// (web_search or web_fetch), returns the JSON-stringified result
// truncated to OLLAMA_TOOL_RESULT_MAX_CHARS so the next chat turn's
// context stays bounded.
//
// Throws BusinessException with code OLLAMA_TOOL_CALL_FAILED on:
//   - unknown tool name
//   - missing required argument
//   - non-2xx response from Ollama
export async function executeOllamaCloudToolCall(
  call: OllamaCloudToolCall,
  options: ExecuteOllamaCloudToolCallOptions,
): Promise<string> {
  const toolName = call.function.name;
  const args = call.function.arguments;
  logger.debug(`executeOllamaCloudToolCall: tool=${toolName}`);

  const endpointPath = resolveEndpointPath(toolName);
  const payload = buildPayload(toolName, args);
  const url = `${stripTrailingSlash(options.baseUrl)}/${endpointPath}`;

  try {
    await options.onDispatch?.();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown';
    logger.warn(`executeOllamaCloudToolCall: tool=${toolName} accounting failed - ${message}`);
  }

  let response: Awaited<ReturnType<typeof httpRequest<unknown>>>;
  try {
    response = await httpRequest<unknown>({
      url,
      method: 'POST',
      headers: { Authorization: `Bearer ${options.apiKey}` },
      body: payload,
      timeoutMs: options.timeoutMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown';
    logger.error(`executeOllamaCloudToolCall: tool=${toolName} fetch failed — ${message}`);
    throw new BusinessException(
      `Ollama tool call ${toolName} failed: ${message}`,
      'OLLAMA_TOOL_CALL_FAILED',
    );
  }

  if (!response.ok) {
    const detail = safeShortify(response.data);
    logger.error(
      `executeOllamaCloudToolCall: tool=${toolName} returned status=${String(response.status)} body=${detail}`,
    );
    throw new BusinessException(
      `Ollama tool call ${toolName} returned status ${String(response.status)}`,
      'OLLAMA_TOOL_CALL_FAILED',
    );
  }

  const serialized = stringifyResult(response.data);
  logger.log(
    `executeOllamaCloudToolCall: tool=${toolName} ok — resultChars=${String(serialized.length)}`,
  );
  return truncateResult(serialized);
}

// Hard-truncates a stringified tool result to OLLAMA_TOOL_RESULT_MAX_CHARS.
// Public for test coverage of the truncation contract.
export function truncateResult(text: string): string {
  if (text.length <= OLLAMA_TOOL_RESULT_MAX_CHARS) {
    return text;
  }
  return `${text.slice(0, OLLAMA_TOOL_RESULT_MAX_CHARS)}\n[truncated: result exceeded ${String(OLLAMA_TOOL_RESULT_MAX_CHARS)} chars]`;
}

function resolveEndpointPath(toolName: string): string {
  if (toolName === TOOL_WEB_SEARCH) {
    return 'web_search';
  }
  if (toolName === TOOL_WEB_FETCH) {
    return 'web_fetch';
  }
  throw new BusinessException(
    `Ollama tool call has unknown tool name: ${toolName}`,
    'OLLAMA_TOOL_CALL_FAILED',
  );
}

function buildPayload(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  if (toolName === TOOL_WEB_SEARCH) {
    const query = readStringArg(args, 'query');
    if (query === null) {
      throw new BusinessException(
        'Ollama web_search call missing required "query" argument',
        'OLLAMA_TOOL_CALL_FAILED',
      );
    }
    const maxResults = readNumberArg(args, 'max_results');
    return maxResults === null ? { query } : { query, max_results: maxResults };
  }
  // web_fetch
  const url = readStringArg(args, 'url');
  if (url === null) {
    throw new BusinessException(
      'Ollama web_fetch call missing required "url" argument',
      'OLLAMA_TOOL_CALL_FAILED',
    );
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new BusinessException(
      `Ollama web_fetch call URL must start with http:// or https:// — got "${url}"`,
      'OLLAMA_TOOL_CALL_FAILED',
    );
  }
  return { url };
}

function readStringArg(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumberArg(args: Record<string, unknown>, key: string): number | null {
  const value = args[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function stringifyResult(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function safeShortify(data: unknown): string {
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return serialized.slice(0, 200);
  } catch {
    return '[unstringifiable error body]';
  }
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
