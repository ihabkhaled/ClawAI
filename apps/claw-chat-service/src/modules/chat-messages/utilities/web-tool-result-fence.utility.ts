import { OLLAMA_TOOL_RESULT_MAX_CHARS } from '../constants/agentic-loop.constants';
import { WEB_SOURCE_UNTRUSTED_INSTRUCTION } from '../constants/research-grounding.constants';
import {
  WEB_CRAWLED_PAGE_TOOL_RESULT_HEADER,
  WEB_FETCH_TOOL_RESULT_HEADER,
  WEB_SEARCH_TOOL_NO_RESULTS,
  WEB_SEARCH_TOOL_RESULT_HEADER,
  WEB_TOOL_HEADER_DETAIL_MAX_CHARS,
  WEB_TOOL_RESULT_HEADER,
  WEB_TOOL_RESULT_MAX_LINKS,
} from '../constants/untrusted-fence.constants';
import type {
  WebPageToolResultInput,
  WebSearchToolHit,
  WebSearchToolResultInput,
} from '../types/untrusted-fence.types';
import { fenceWebSources, sanitizeUntrustedText } from './untrusted-fence.utility';

/** A platform-written detail for a header line (provider names, a date): one plain line, never markup. */
function headerDetail(text: string): string {
  return sanitizeUntrustedText(text, WEB_TOOL_HEADER_DETAIL_MAX_CHARS)
    .replaceAll(/[\r\n<>]+/gu, ' ')
    .trim();
}

/** Header + instruction, then the fenced sources, all within the tool-result cap so no fence is ever cut open. */
function withHeader(header: string, fenced: (room: number) => string): string {
  const head = `${header} ${WEB_SOURCE_UNTRUSTED_INSTRUCTION}`;
  return `${head}\n${fenced(OLLAMA_TOOL_RESULT_MAX_CHARS - head.length - 1)}`;
}

/**
 * A `web_search` tool result as the model sees it (research engine B1): one `web_source` fence per hit, numbered
 * from 1, inside the tool-result cap. The providers that searched are named in the platform's header line.
 */
export function fenceWebSearchToolResult(input: WebSearchToolResultInput): string {
  if (input.hits.length === 0) {
    return WEB_SEARCH_TOOL_NO_RESULTS;
  }
  const details = [
    ...(input.providers !== undefined && input.providers.length > 0
      ? [`providers: ${input.providers.join(', ')}`]
      : []),
    ...(input.mode === undefined || input.mode.length === 0 ? [] : [`mode: ${input.mode}`]),
  ]
    .map(headerDetail)
    .join('; ');
  return withHeader(
    WEB_SEARCH_TOOL_RESULT_HEADER.replace('{details}', details.length > 0 ? ` (${details})` : ''),
    (room) =>
      fenceWebSources(
        input.hits.map((hit, index) => ({
          n: index + 1,
          url: hit.url,
          title: hit.title,
          text: hit.content,
          details:
            hit.foundBy !== undefined && hit.foundBy.length > 0
              ? [`Found by: ${hit.foundBy.join(', ')}`]
              : [],
        })),
        room,
      ),
  );
}

function pageText(page: WebPageToolResultInput): string {
  const links = (page.links ?? []).slice(0, WEB_TOOL_RESULT_MAX_LINKS);
  return links.length === 0
    ? page.content
    : `${page.content}\n\nLinks on the page:\n${links.map((link) => `- ${link}`).join('\n')}`;
}

/** A `web_fetch` tool result: the one page in a `web_source` fence; an archived copy is labelled as one. */
export function fenceWebFetchToolResult(page: WebPageToolResultInput): string {
  const archived =
    page.archivedAt === undefined
      ? ''
      : ` (an archived copy, captured ${headerDetail(page.archivedAt)})`;
  return withHeader(WEB_FETCH_TOOL_RESULT_HEADER.replace('{details}', archived), (room) =>
    fenceWebSources([{ n: 1, url: page.url, title: page.title, text: pageText(page) }], room),
  );
}

/** A `get_crawled_page` tool result: a page this turn already crawled, fenced like any other web page. */
export function fenceCrawledPageToolResult(page: WebPageToolResultInput): string {
  return withHeader(WEB_CRAWLED_PAGE_TOOL_RESULT_HEADER, (room) =>
    fenceWebSources([{ n: 1, url: page.url, title: page.title, text: page.content }], room),
  );
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = new Map(Object.entries(record)).get(key);
  return typeof value === 'string' ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hostedHits(results: unknown[]): WebSearchToolHit[] {
  return results.map(asRecord).flatMap((result) =>
    result === null
      ? []
      : [
          {
            title: readString(result, 'title'),
            url: readString(result, 'url') ?? '',
            content: readString(result, 'content') ?? '',
          },
        ],
  );
}

/**
 * Ollama Cloud's hosted `web_search` / `web_fetch` answer (the fallback), fenced the same way: `{ results: [...] }`
 * becomes one fence per hit, `{ title, content, links }` one page fence; any other shape is fenced whole as one source
 * so nothing the web returned ever reaches the model unfenced.
 */
export function fenceHostedWebToolResult(
  data: unknown,
  serialized: string,
  requestedUrl: string,
): string {
  const record = asRecord(data);
  const results = record === null ? undefined : new Map(Object.entries(record)).get('results');
  if (Array.isArray(results)) {
    return fenceWebSearchToolResult({ hits: hostedHits(results) });
  }
  const content = record === null ? null : readString(record, 'content');
  if (record !== null && content !== null) {
    const links = new Map(Object.entries(record)).get('links');
    return fenceWebFetchToolResult({
      url: requestedUrl,
      title: readString(record, 'title'),
      content,
      links: Array.isArray(links)
        ? links.filter((link): link is string => typeof link === 'string')
        : [],
    });
  }
  return withHeader(WEB_TOOL_RESULT_HEADER, (room) =>
    fenceWebSources([{ n: 1, url: requestedUrl, title: null, text: serialized }], room),
  );
}
