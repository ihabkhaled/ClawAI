// A claim on (user, operation, key).
//
// `requestHash` is what distinguishes a genuine retry from a key reused across
// two different requests: same key + different hash is an error, not a replay.
export type ClaimIdempotencyData = {
  userId: string;
  operation: string;
  key: string;
  requestHash: string;
  expiresAt: Date;
};
