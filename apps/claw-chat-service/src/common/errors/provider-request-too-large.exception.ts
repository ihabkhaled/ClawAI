import { HttpStatus } from '@nestjs/common';
import { BusinessException } from './business.exception';
import { PROVIDER_REQUEST_TOO_LARGE_CODE } from '../../modules/chat-messages/constants/provider-credit.constants';

/**
 * The provider refused this request for being bigger than the per-request allowance of our
 * account tier (Groq on_demand 413 "Request too large ... Limit 8000, Requested 17934").
 * It is a property of the tier, not of the prompt text: the same body fails every time, so it
 * is never retried. The message holds only the two numbers, never provider text.
 */
export class ProviderRequestTooLargeException extends BusinessException {
  constructor(
    public readonly limitTokens: number,
    public readonly requestedTokens: number,
  ) {
    super(
      `The provider accepts at most ${String(limitTokens)} tokens per request for this model and this request is ${String(requestedTokens)}`,
      PROVIDER_REQUEST_TOO_LARGE_CODE,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}
