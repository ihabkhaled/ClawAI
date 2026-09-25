import { BusinessException } from './business.exception';
import {
  PROVIDER_RATE_LIMITED_MESSAGE,
  PROVIDER_RATE_LIMITED_MESSAGE_KEY,
} from '../../modules/chat-messages/constants/provider-credit.constants';

/**
 * A transient upstream rate limit (OpenRouter ":free ... temporarily
 * rate-limited upstream", a 429). The chokepoint waits briefly and retries once;
 * after that AUTO moves on (ADR-125). `code` stays the caller's failure code
 * (CLOUD_PROVIDER_UNAVAILABLE for a 429) so Runtime V2's transient retry still
 * recognises it; the user reads the translated `messageKey`.
 */
export class ProviderRateLimitedException extends BusinessException {
  constructor(code: string) {
    super(PROVIDER_RATE_LIMITED_MESSAGE, code, undefined, PROVIDER_RATE_LIMITED_MESSAGE_KEY);
  }
}
