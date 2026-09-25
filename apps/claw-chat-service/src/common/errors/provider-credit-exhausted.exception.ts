import { HttpStatus } from '@nestjs/common';
import { BusinessException } from './business.exception';
import {
  PROVIDER_CREDIT_EXHAUSTED_CODE,
  PROVIDER_CREDIT_EXHAUSTED_MESSAGE,
  PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY,
} from '../../modules/chat-messages/constants/provider-credit.constants';

/**
 * A provider refused a call because the operator's account at that provider
 * cannot pay for it (OpenRouter 402 "can only afford N", an exhausted balance).
 *
 * 503, not 402: a 402 means the USER's credit and ends the fallback chain
 * (`isPaygRefusal`); an empty provider key says nothing about the next provider.
 *
 * `affordableOutputTokens` is the ceiling the provider said it would accept,
 * when it said one — the chokepoint retries once below it.
 * `accountExhausted` is true when the whole ACCOUNT is out of money (OpenAI
 * insufficient_quota, Anthropic "credit balance is too low"): every call on
 * this key will fail, so the provider circuit breaker opens (ADR-125). The
 * message is a fixed sentence; provider text is never kept on this error.
 */
export class ProviderCreditExhaustedException extends BusinessException {
  constructor(
    public readonly affordableOutputTokens: number | undefined,
    public readonly accountExhausted = false,
  ) {
    super(
      PROVIDER_CREDIT_EXHAUSTED_MESSAGE,
      PROVIDER_CREDIT_EXHAUSTED_CODE,
      HttpStatus.SERVICE_UNAVAILABLE,
      PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY,
    );
  }
}
