import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';

export type ClassifiedSearchError = {
  status: SearchProviderRunStatus.FAILED | SearchProviderRunStatus.TIMEOUT;
  code: ResearchErrorCode;
};

const HTTP_STATUS = /\bHTTP (\d{3})\b/u;
const TIMEOUT_NAMES: ReadonlySet<string> = new Set(['TimeoutError', 'AbortError']);
const NETWORK_HINT = /fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket|network/iu;

/**
 * Turns whatever an adapter threw into a stable code. Adapters throw plain
 * `Error('<Name> search failed: HTTP 429')`, so the status is read from the
 * message; nothing else of the message leaves this function.
 */
export function classifySearchError(error: unknown): ClassifiedSearchError {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (TIMEOUT_NAMES.has(name) || /timed? ?out|timeout/iu.test(message)) {
    return { status: SearchProviderRunStatus.TIMEOUT, code: ResearchErrorCode.SEARCH_TIMEOUT };
  }
  const http = HTTP_STATUS.exec(message);
  const httpStatus = http?.[1] === undefined ? null : Number.parseInt(http[1], 10);
  const failed = SearchProviderRunStatus.FAILED;
  if (httpStatus === 429) {
    return { status: failed, code: ResearchErrorCode.PROVIDER_RATE_LIMITED };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return { status: failed, code: ResearchErrorCode.PROVIDER_AUTH_FAILED };
  }
  return (httpStatus !== null && httpStatus >= 500) || NETWORK_HINT.test(message)
    ? { status: failed, code: ResearchErrorCode.PROVIDER_UNAVAILABLE }
    : { status: failed, code: ResearchErrorCode.SEARCH_FAILED };
}
