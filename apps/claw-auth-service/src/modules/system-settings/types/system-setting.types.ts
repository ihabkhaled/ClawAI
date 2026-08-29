/** One setting as the admin API returns it. */
export type SystemSettingView = {
  key: string;
  value: string;
  updatedAt: string;
};

/**
 * A cached read. `expiresAt` is an epoch millisecond stamp rather than a timer
 * so a process that was paused (a suspended container, a long GC) re-reads on
 * its next call instead of trusting a timer that never fired.
 */
export type CachedSystemSetting = {
  value: string | null;
  expiresAt: number;
};
