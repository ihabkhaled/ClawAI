// Two presentation policies, because one number cannot serve both.
//
// A plan price wants to look like a price. A usage charge wants to stay
// truthful: rounding $0.004 of consumption to "$0.00" tells the user they were
// charged nothing, which is a lie about their own money.
export enum DisplayRoundingPolicy {
  // Plans, top-up packages, marketing, checkout estimates.
  COMMERCIAL_PRICE = 'COMMERCIAL_PRICE',
  // Wallet balances, usage ledgers, admin financial diagnostics.
  PRECISE_USAGE = 'PRECISE_USAGE',
}

// Bumped whenever the rounding increments change. Display-only, so no invoice
// or ledger row is ever migrated — it exists so a test failure and a metric can
// name which policy produced a number.
export const DISPLAY_ROUNDING_POLICY_VERSION = 1;
