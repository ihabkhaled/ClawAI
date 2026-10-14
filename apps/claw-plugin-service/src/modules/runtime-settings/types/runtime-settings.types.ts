/** The admin settings the runtime reads on each call, each already range-checked or defaulted. */
export type RuntimeSettings = {
  userServersEnabled: boolean;
  requireApproval: boolean;
  callTimeoutMs: number;
  maxResultBytes: number;
  ratePerMinute: number;
  concurrentPerUser: number;
};

export type RuntimeSettingRow = { key: string; value: unknown };

/** The tool loop caps a chat message runs under. */
export type LoopLimits = { maxRounds: number; maxCallsPerTurn: number };
