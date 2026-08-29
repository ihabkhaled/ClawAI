import { ROUTER_PROMPT_CHARS_PER_TOKEN } from '../constants/router-adapter.constants';

/**
 * Approximate prompt size for a PAYG reservation, before the provider answers.
 *
 * A reservation has to be taken BEFORE the call, and no provider tells you the
 * token count until afterwards, so some estimate is unavoidable. This one is
 * deliberately pessimistic (see `ROUTER_PROMPT_CHARS_PER_TOKEN`) so the hold
 * covers the real prompt rather than falling short of it — `finalize`
 * reconciles against the provider's reported `prompt_tokens` and returns the
 * difference, so erring high costs the user nothing and erring low would let a
 * request start that the balance cannot pay for.
 *
 * Returns an integer, because the reservation contract bounds every token field
 * as an integer and a fractional token is not a thing a wallet can hold.
 */
export function estimateRouterPromptTokens(prompt: string): number {
  if (prompt.length === 0) {
    return 0;
  }
  return Math.ceil(prompt.length / ROUTER_PROMPT_CHARS_PER_TOKEN);
}
