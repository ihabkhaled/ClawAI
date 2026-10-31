/** What an administrator sees for one login (a refresh family). EXPIRED is decided from the clock, never stored. */
export enum SessionState {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}
