import {
  SEARCH_CONTINUATION_QUERY_MAX_CHARS,
  SEARCH_HARMONY_PATTERN,
  SEARCH_JSON_FENCE,
  SEARCH_MARKUP_MAX_CHARS,
  SEARCH_PROMISE_CITATION_PATTERN,
  SEARCH_PROMISE_JUDGE_MESSAGE_MAX_CHARS,
  SEARCH_PROMISE_JUDGE_SYSTEM_PROMPT,
  SEARCH_PROMISE_MAX_CHARS,
  SEARCH_PROMISE_QUESTION_END_PATTERN,
  SEARCH_TAG_PATTERN,
  SEARCH_TOOL_BLOCK_PATTERN,
  SEARCH_TOOL_NAME_PREFIX,
  SEARCH_TOOL_NAMES,
  SEARCH_TOOL_QUERY_KEYS,
} from '../constants/search-continuation.constants';
import type {
  PendingSearch,
  RequestedTool,
  SearchPromiseVerdict,
} from '../types/search-continuation.types';
import { extractFirstJsonObject } from './harness-council.utility';
import { fenceUntrusted, sanitizeUntrustedText } from './untrusted-fence.utility';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseJsonRecord(text: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return null;
  }
}

function cleanQuery(value: unknown): string | null {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string') {
    return null;
  }
  const query = first.replaceAll(/\s+/gu, ' ').trim().slice(0, SEARCH_CONTINUATION_QUERY_MAX_CHARS);
  return query.length >= 2 ? query : null;
}

function queryFromRecord(record: Record<string, unknown> | null): string | null {
  if (record === null) {
    return null;
  }
  const entries = new Map(Object.entries(record));
  for (const key of SEARCH_TOOL_QUERY_KEYS) {
    const query = cleanQuery(entries.get(key));
    if (query !== null) {
      return query;
    }
  }
  return null;
}

export function isSearchToolName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  const bare = lower.startsWith(SEARCH_TOOL_NAME_PREFIX)
    ? lower.slice(SEARCH_TOOL_NAME_PREFIX.length)
    : lower;
  return SEARCH_TOOL_NAMES.has(bare.replaceAll('.', '_').replaceAll('-', '_'));
}

/** The JSON object a reply consists of, with an optional code fence around it; null for anything else. */
function jsonOnlyBody(text: string): string | null {
  let body = text;
  if (body.startsWith(SEARCH_JSON_FENCE) && body.endsWith(SEARCH_JSON_FENCE) && body.length > 6) {
    body = body.slice(SEARCH_JSON_FENCE.length, -SEARCH_JSON_FENCE.length).trim();
    body = body.startsWith('json') ? body.slice('json'.length).trim() : body;
  }
  return body.startsWith('{') && body.endsWith('}') ? body : null;
}

/** The provider's raw tool calls (OpenAI, Ollama and Anthropic shapes) as name plus argument text. */
export function requestedToolsOf(raw: unknown): RequestedTool[] {
  const entries: unknown[] = Array.isArray(raw) ? raw : [];
  return entries.flatMap((entry): RequestedTool[] => {
    const record = asRecord(entry);
    if (record === null) {
      return [];
    }
    const call = asRecord(record['function']) ?? record;
    const name = typeof call['name'] === 'string' ? call['name'].trim() : '';
    if (name.length === 0) {
      return [];
    }
    const args: unknown = call['arguments'] ?? call['input'] ?? '';
    return [{ name, argumentsText: typeof args === 'string' ? args : JSON.stringify(args) }];
  });
}

/** A tool request written as text: `{"name": "web_search", "arguments": {…}}` and its common spellings. */
function pendingFromRequestRecord(record: Record<string, unknown> | null): PendingSearch | null {
  if (record === null) {
    return null;
  }
  const name = record['name'] ?? record['tool'] ?? record['tool_name'] ?? record['action'];
  if (typeof name !== 'string' || !isSearchToolName(name)) {
    return null;
  }
  const args: unknown =
    record['arguments'] ?? record['parameters'] ?? record['args'] ?? record['action_input'];
  const argsRecord = typeof args === 'string' ? parseJsonRecord(args) : asRecord(args);
  return { signal: 'markup', query: queryFromRecord(argsRecord) ?? queryFromRecord(record) };
}

function pendingFromHarmony(content: string): PendingSearch | null {
  const match = SEARCH_HARMONY_PATTERN.exec(content);
  if (match === null) {
    return null;
  }
  const json = extractFirstJsonObject(content.slice(match.index));
  return { signal: 'markup', query: queryFromRecord(json === null ? null : parseJsonRecord(json)) };
}

function pendingFromMarkup(content: string): PendingSearch | null {
  const text = content.trim();
  if (text.length === 0 || text.length > SEARCH_MARKUP_MAX_CHARS) {
    return null;
  }
  const tagged = SEARCH_TAG_PATTERN.exec(text)?.groups?.['query'];
  if (tagged !== undefined) {
    return { signal: 'markup', query: cleanQuery(tagged) };
  }
  const jsonOnly = jsonOnlyBody(text);
  if (jsonOnly !== null) {
    return pendingFromRequestRecord(parseJsonRecord(jsonOnly));
  }
  const block = SEARCH_TOOL_BLOCK_PATTERN.exec(text)?.groups?.['body'];
  if (block !== undefined) {
    const json = extractFirstJsonObject(block);
    return pendingFromRequestRecord(json === null ? null : parseJsonRecord(json));
  }
  return pendingFromHarmony(text);
}

/** A promised search the reply shows structurally: a web tool call, or web-tool markup written as text. */
export function detectStructuralPendingSearch(
  content: string,
  requestedTools: readonly RequestedTool[] = [],
): PendingSearch | null {
  const call = requestedTools.find((tool) => isSearchToolName(tool.name));
  return call === undefined
    ? pendingFromMarkup(content)
    : { signal: 'tool-call', query: queryFromRecord(parseJsonRecord(call.argumentsText)) };
}

/** Whether a reply is worth one judge call: short, uncited, not a question, no code. */
export function isSearchPromiseCandidate(content: string): boolean {
  const text = content.trim();
  return (
    text.length > 0 &&
    text.length <= SEARCH_PROMISE_MAX_CHARS &&
    !text.includes('```') &&
    !SEARCH_PROMISE_CITATION_PATTERN.test(text) &&
    !SEARCH_PROMISE_QUESTION_END_PATTERN.test(text)
  );
}

function judgeData(tag: string, text: string): string {
  return fenceUntrusted({
    tag,
    attributes: [],
    body: sanitizeUntrustedText(text, SEARCH_PROMISE_JUDGE_MESSAGE_MAX_CHARS).replaceAll(
      `</${tag}`,
      `< /${tag}`,
    ),
  });
}

export function buildSearchPromisePrompt(userMessage: string, reply: string): string {
  return [
    SEARCH_PROMISE_JUDGE_SYSTEM_PROMPT,
    judgeData('user_message', userMessage),
    judgeData('assistant_reply', reply),
  ].join('\n\n');
}

/** Null when the judge's reply cannot be read, so the next candidate is asked. */
export function parseSearchPromiseVerdict(raw: string): SearchPromiseVerdict | null {
  const json = extractFirstJsonObject(raw);
  const record = json === null ? null : parseJsonRecord(json);
  const verdict = record?.['promisesSearch'];
  return typeof verdict === 'boolean'
    ? { promisesSearch: verdict, query: cleanQuery(record?.['query']) }
    : null;
}
