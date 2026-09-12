import { z } from 'zod';

// Both upstreams are untrusted external systems. Everything they return is
// parsed before it is believed: a rate that arrives as an object, an array or a
// four-kilobyte string is a broken provider, and a broken provider must look
// exactly like an unavailable one.

// Frankfurter v1: { "amount": 1, "base": "USD", "date": "2026-09-11",
//                   "rates": { "EGP": 51.28 } }
export const frankfurterResponseSchema = z.object({
  base: z.string().min(3).max(3),
  date: z.string().min(8).max(10),
  rates: z.record(z.string().max(8), z.number().finite().positive()),
});

// fawazahmed0/exchange-api: { "date": "2026-09-11", "usd": { "egp": 51.28 } }
// Keys are lowercase and the payload carries every asset the project tracks,
// including crypto — which is exactly why the value is looked up by key and the
// rest of the object is never enumerated into anything user-facing.
export const fawazResponseSchema = z.object({
  date: z.string().min(8).max(10),
});

// country.is: { "ip": "1.2.3.4", "country": "EG" }
// The `ip` field is parsed and then discarded. It is the address ClawAI already
// had; echoing it into a log or a response would be the one privacy mistake
// this whole path is designed to avoid.
export const countryIsResponseSchema = z.object({
  country: z.string().min(2).max(2),
});
