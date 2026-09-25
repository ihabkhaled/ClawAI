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
 * when it said one — the chokepoint retries once below it. The message is a
 * fixed sentence; the provider's text (which carried a key-management URL) is
 * never kept on this error.
 */
export class ProviderCreditExhaustedException extends BusinessException {
  constructor(public readonly affordableOutputTokens: number | undefined) {
    super(
      PROVIDER_CREDIT_EXHAUSTED_MESSAGE,
      PROVIDER_CREDIT_EXHAUSTED_CODE,
      HttpStatus.SERVICE_UNAVAILABLE,
      PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY,
    );
  }
}
