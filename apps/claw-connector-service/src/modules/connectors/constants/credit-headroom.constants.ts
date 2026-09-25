import { type ProviderCreditHeadroom } from '../types/credit-headroom.types';

// How long one connector's key balance is reused. Short on purpose: the
// balance moves with every paid call, and a stale high reading only costs one
// reactive 402 retry in chat-service. 60 s bounds the extra provider hop to
// one per connector per minute however busy chat is.
export const CREDIT_HEADROOM_CACHE_TTL_MS = 60_000;

// Per key-credit endpoint. This sits on the send path of a chat turn (on a
// cache miss), and an unreadable balance only means "no pre-flight cap".
export const CREDIT_HEADROOM_TIMEOUT_MS = 2_500;

// Bounds the in-process cache; there is one entry per connector.
export const CREDIT_HEADROOM_CACHE_MAX_ENTRIES = 64;

// Micro-USD has six decimal places.
export const MICRO_USD_DECIMALS = 6;

// Extra digit read before truncating, so a float's binary noise in the 7th
// place never rounds the 6th up (a balance is floored, never rounded).
export const MICRO_USD_PARSE_DECIMALS = 7;

export const UNKNOWN_CREDIT_HEADROOM: ProviderCreditHeadroom = {
  known: false,
  remainingMicroUsd: null,
};

export const UNLIMITED_CREDIT_HEADROOM: ProviderCreditHeadroom = {
  known: true,
  remainingMicroUsd: null,
};
