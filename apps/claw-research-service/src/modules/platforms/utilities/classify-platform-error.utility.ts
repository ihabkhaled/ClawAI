import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { classifySearchError } from '../../search/utilities/classify-search-error.utility';
import { PlatformHostRefusedError } from '../errors/platform-host-refused.error';

/**
 * A stable code for a failed platform call: a refused host is `UNSAFE_URL`,
 * everything else is classified like a search provider failure (timeout,
 * 429, 401/403, 5xx/network, other). The error's text never leaves here.
 */
export function classifyPlatformError(error: unknown): ResearchErrorCode {
  return error instanceof PlatformHostRefusedError
    ? ResearchErrorCode.UNSAFE_URL
    : classifySearchError(error).code;
}
