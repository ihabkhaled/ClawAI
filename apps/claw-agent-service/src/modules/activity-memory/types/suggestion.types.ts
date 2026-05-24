/**
 * V2 Stream 05 — Activity-driven suggestion types.
 */

export type SuggestionGroupCount = {
  userId: string;
  kind: string;
  occurrences: number;
  sampleIds: string[];
  latestSummary: string;
};
