import type { NarrationKind } from '@/enums/narration-kind.enum';

import type { TranslateFunction } from './i18n.types';

/**
 * A work-log line's params. Research rounds add optional counters (B2/B3): `round`, `queries`,
 * `languages` (comma list of ISO codes), `duplicatesRemoved`, `reusedFromThread`, `platforms`
 * (comma list of slugs). A line without them reads exactly as before.
 */
export type NarrationParams = Record<string, string | number>;

/** One line of a turn's work log. Mirrors chat-service's NarrationEntry. */
export type NarrationEntry = {
  id: string;
  kind: NarrationKind;
  /** The planner's own sentence (PLANNED / REPLANNED only). */
  text?: string;
  params?: NarrationParams;
  at: string;
};

export type NarrationLogProps = {
  entries: readonly NarrationEntry[];
  /** True while the turn is still running: the log is open and the last line pulses. */
  isLive: boolean;
  t: TranslateFunction;
};

export type UseNarrationLogReturn = {
  /** One log line in the reader's language. */
  describe: (entry: NarrationEntry) => string;
};
