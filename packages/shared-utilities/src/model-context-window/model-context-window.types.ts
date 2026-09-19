/** One row of the known-family context window table. */
export interface KnownContextWindowEntry {
  provider: string;
  pattern: RegExp;
  tokens: number;
}
