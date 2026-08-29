// Which ceiling rejected a quota reservation. Mirrors the window names the
// atomic Lua script returns, and maps 1:1 to the stable billing error codes the
// API surfaces (QUOTA_DAILY_EXCEEDED, PROVIDER_COST_BUDGET_EXCEEDED, …).
//
// The provider-cost window is deliberately nameable here but its VALUE is never
// returned to a normal user — the budget is an internal profitability control.
export enum QuotaRejectionWindow {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  PROVIDER_COST = 'PROVIDER_COST',
  CONCURRENCY = 'CONCURRENCY',
  CHATS = 'CHATS',
  MESSAGES = 'MESSAGES',
  // PAYG credit windows (ADR-080). Unlike the six above these are not token
  // windows at all: the "limit" is the wallet bucket's balance and the counter
  // is only the outstanding holds, so a rejection here means "out of credit",
  // not "over a rate limit". They map to PAYG_CREDIT_EXHAUSTED rather than to a
  // QUOTA_* code.
  CREDIT_GRANT = 'CREDIT_GRANT',
  CREDIT_PURCHASED = 'CREDIT_PURCHASED',
}
