export type RuntimeAdmissionAck = {
  requestId: string;
  planId: string | null;
  estimatedTokens: number;
  reservationId: string;
  replayed: boolean;
  adminBypass: boolean;
};

export type RuntimeAdmissionRedisReply = readonly [
  status: 'OK' | 'REPLAY' | 'CONFLICT' | 'DENIED',
  payload: string,
];
