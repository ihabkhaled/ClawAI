import type { NarrationKind } from '../../../common/enums/narration-kind.enum';

/** One line of a turn's work log, streamed live and stored on the answer. */
export type NarrationEntry = {
  id: string;
  kind: NarrationKind;
  /** Model-written sentence (PLANNED / REPLANNED only); everything else is rendered from `kind` + `params`. */
  text?: string;
  params?: Record<string, string | number>;
  at: string;
};

export type NarrationInput = Omit<NarrationEntry, 'id' | 'at'>;
