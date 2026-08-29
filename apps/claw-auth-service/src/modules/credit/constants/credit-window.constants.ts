// Where the two PAYG credit counters sit in the key array `buildQuotaKeys`
// returns.
//
// Named rather than inlined because the array IS the contract with
// RESERVE_QUOTA_LUA: KEYS[8] and KEYS[9] in Lua are indices 7 and 8 here, and a
// silent off-by-one would check one user's grant against another window's
// counter. Anything that reorders `buildQuotaKeys` has to change these too, and
// the constant is what makes that obvious.
export const CREDIT_GRANT_HOLD_KEY_INDEX = 7;
export const CREDIT_PURCHASED_HOLD_KEY_INDEX = 8;
