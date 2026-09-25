import { TOKENS_PER_PRICING_UNIT } from '@claw/shared-constants';

import {
  PROVIDER_CREDIT_SAFETY_DENOMINATOR,
  PROVIDER_CREDIT_SAFETY_NUMERATOR,
} from '../constants/provider-credit.constants';
import { type ProviderTokenRates } from '../types/provider-credit.types';

/**
 * How many output tokens a provider KEY's remaining credit can pay for.
 *
 * floor((remaining − input cost) / output price per token × 0.9). Money is
 * integer micro-USD and every product is BigInt (rule 37 §3), so a large
 * balance cannot lose precision. The input cost rounds UP and the token count
 * DOWN — the same directions as the PAYG meter's shared affordability math —
 * so this can only under-estimate. Output is priced at the dearer of the
 * answer and reasoning rates, since the split is unknowable before the call.
 * The 10% slack covers the tokenizer gap between our prompt estimate and the
 * provider's count.
 *
 * `undefined` = affordability does not bind (the model has no output price);
 * the caller sends no cap on it.
 */
export function providerAffordableOutputTokens(
  remainingMicroUsd: number,
  promptTokens: number,
  rates: ProviderTokenRates,
): number | undefined {
  const outputRate = BigInt(
    Math.max(rates.outputPerMillionMicroUsd ?? 0, rates.reasoningPerMillionMicroUsd ?? 0),
  );
  if (outputRate <= 0n) {
    return undefined;
  }
  const unit = BigInt(TOKENS_PER_PRICING_UNIT);
  const inputCost =
    (BigInt(Math.max(0, promptTokens)) * BigInt(rates.inputPerMillionMicroUsd ?? 0) + unit - 1n) /
    unit;
  const left = BigInt(remainingMicroUsd) - inputCost;
  if (left <= 0n) {
    return 0;
  }
  const tokens =
    (((left * unit) / outputRate) * BigInt(PROVIDER_CREDIT_SAFETY_NUMERATOR)) /
    BigInt(PROVIDER_CREDIT_SAFETY_DENOMINATOR);
  return tokens > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(tokens);
}
