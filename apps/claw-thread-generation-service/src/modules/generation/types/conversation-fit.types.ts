/** A source conversation condensed to a character budget. */
export type FittedConversation = {
  messages: unknown[];
  /** What was left out, in plain words for the model; null when nothing was. */
  note: string | null;
};

/** One message as the fitter sees it: its place, its text and how much it matters. */
export type FitEntry = {
  message: unknown;
  content: string | null;
  length: number;
  weight: number;
  /** Characters this message may keep; set by the allocation. */
  share: number;
};
