import type { ChatMessage, ChatThread } from '../../../generated/prisma';
import type { AssembledContext } from './context.types';
import type { LlmResponse, MessageRoutedData, ThreadSettings } from './execution.types';

/** A tool a model asked for although this call offered no tool catalog (ADR-227). */
export type RequestedTool = {
  name: string;
  /** The arguments exactly as the provider sent them: JSON text, or the object serialised. */
  argumentsText: string;
};

/** How a promised search was recognised. */
export type PendingSearchSignal = 'tool-call' | 'markup' | 'judge';

export type PendingSearch = {
  signal: PendingSearchSignal;
  /** The query to search; null when the model gave none (the caller derives one from the conversation). */
  query: string | null;
};

export type SearchPromiseVerdict = {
  promisesSearch: boolean;
  query: string | null;
};

/** `metadata.searchContinuation` on the assistant message that only promised a search. */
export type SearchContinuationRecord = {
  status: 'pending' | 'done';
  query: string | null;
};

/** What `runLlmAndStore` knows when a first reply may only have promised a search. */
export type PromisedSearchTurn = {
  executed: LlmResponse;
  effectivePayload: MessageRoutedData;
  originalPayload: MessageRoutedData;
  context: AssembledContext;
  threadSettings: ThreadSettings | undefined;
  fileIds: string[] | undefined;
  thread: ChatThread | null;
  chronologicalMessages: ChatMessage[];
  latestUserMetadata: Record<string, unknown> | null;
};

/** The context and user metadata a reply was written from. */
export type AnswerContext = {
  context: AssembledContext;
  userMetadata: Record<string, unknown> | null;
};

/** The reply that answers the turn, with what it was written from. */
export type ContinuedAnswer = AnswerContext & { response: LlmResponse };
