/**
 * The security limiter could not count this request (Redis error, no answer in
 * time, or a malformed reply). The service throws it, the guard turns it into
 * a 503 (rules/58 item 7). Carries no key, address, IP or code.
 */
export class AgentAuthRateLimitUnavailableError extends Error {
  constructor() {
    super('agent auth rate limiter unavailable');
    this.name = 'AgentAuthRateLimitUnavailableError';
  }
}
