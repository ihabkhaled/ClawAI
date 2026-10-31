import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { SearchProviderRunStatus } from '../../../../common/enums/search-provider-run-status.enum';
import { classifySearchError } from '../classify-search-error.utility';

describe('classifySearchError', () => {
  it.each([
    ['Tavily search failed: HTTP 429', ResearchErrorCode.PROVIDER_RATE_LIMITED],
    ['Exa search failed: HTTP 401', ResearchErrorCode.PROVIDER_AUTH_FAILED],
    ['Brave search failed: HTTP 503', ResearchErrorCode.PROVIDER_UNAVAILABLE],
    ['fetch failed', ResearchErrorCode.PROVIDER_UNAVAILABLE],
    ['something odd', ResearchErrorCode.SEARCH_FAILED],
  ])('%s -> %s', (message, code) => {
    expect(classifySearchError(new Error(message))).toEqual({
      status: SearchProviderRunStatus.FAILED,
      code,
    });
  });

  it('classifies abort/timeout errors as TIMEOUT', () => {
    const abort = new Error('The operation was aborted due to timeout');
    abort.name = 'TimeoutError';
    expect(classifySearchError(abort)).toEqual({
      status: SearchProviderRunStatus.TIMEOUT,
      code: ResearchErrorCode.SEARCH_TIMEOUT,
    });
  });

  it('handles non-Error throws', () => {
    expect(classifySearchError('boom').code).toBe(ResearchErrorCode.SEARCH_FAILED);
  });
});
