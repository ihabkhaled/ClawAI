export type TopicNotesInput = {
  rawTopic: string;
  /** One entry per read part, in order: its notes, or a gap line. */
  entries: readonly string[];
  partCount: number;
  readCount: number;
};
