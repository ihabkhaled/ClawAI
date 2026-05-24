/**
 * V2 Stream 05 — Activity-driven suggestion types.
 */
import type { Prisma } from '../../../generated/prisma';

export type SuggestionGroupCount = {
  userId: string;
  kind: string;
  occurrences: number;
  sampleIds: string[];
  latestSummary: string;
};

/**
 * Repository input shape for upserting a PENDING AgentSuggestion. The
 * userId, kind, and status keys are fixed by the upsert call site and
 * therefore omitted here so the caller cannot accidentally pass them
 * twice. Kept in types/ rather than the repository file because the
 * `'userId' | 'kind' | 'status'` keyof union triggers
 * no-restricted-syntax in logic files.
 */
export type AgentSuggestionUpsertData = Omit<
  Prisma.AgentSuggestionUncheckedCreateInput,
  'userId' | 'kind' | 'status'
>;
