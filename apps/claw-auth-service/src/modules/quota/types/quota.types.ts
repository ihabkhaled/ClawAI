export type QuotaSnapshot = {
  dailyLimit: number;
  used: number;
  remaining: number;
};

export type ReserveResult =
  | { ok: true; reservationId: string; estimate: number }
  | { ok: false; reason: 'QUOTA_EXCEEDED'; snapshot: QuotaSnapshot };

export type FinalizeInput = {
  userId: string;
  planId: string | null;
  reservationId: string;
  estimate: number;
  actualTotalTokens: number;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
};
