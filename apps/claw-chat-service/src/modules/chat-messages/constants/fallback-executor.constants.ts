// Hard ceiling on attempts — even if ROUTING_MAX_FALLBACK_ATTEMPTS is set
// higher in env (Zod allows up to 10), the executor caps at this to
// protect the user from waiting through a long chain when the provider
// network is having a bad day. Keeps SLA bounded.
export const FALLBACK_EXECUTOR_HARD_MAX_ATTEMPTS = 5;
