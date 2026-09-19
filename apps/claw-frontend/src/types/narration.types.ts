import type { NarrationKind } from '@/enums/narration-kind.enum';

import type { TranslateFunction } from './i18n.types';

/** One line of a turn's work log. Mirrors chat-service's NarrationEntry. */
export type NarrationEntry = {
  id: string;
  kind: NarrationKind;
  /** The planner's own sentence (PLANNED / REPLANNED only). */
  text?: string;
  params?: Record<string, string | number>;
  at: string;
};

export type NarrationLogProps = {
  entries: readonly NarrationEntry[];
  /** True while the turn is still running: the log is open and the last line pulses. */
  isLive: boolean;
  t: TranslateFunction;
};
