import { BusinessException } from './business.exception';
import {
  PROVIDER_OUTPUT_LIMIT_MESSAGE,
  PROVIDER_OUTPUT_LIMIT_MESSAGE_KEY,
} from '../../modules/chat-messages/constants/provider-credit.constants';

/**
 * A provider refused the requested `max_tokens` and stated the model's real
 * ceiling (Groq "less than or equal to `16384`", Ollama "maximum output tokens
 * (16384)", ...). The chokepoint retries once at `maxOutputTokens` and
 * remembers it for the model (ADR-125). The provider's text is never kept.
 */
export class ProviderOutputLimitException extends BusinessException {
  constructor(
    public readonly maxOutputTokens: number,
    code: string,
  ) {
    super(PROVIDER_OUTPUT_LIMIT_MESSAGE, code, undefined, PROVIDER_OUTPUT_LIMIT_MESSAGE_KEY);
  }
}
