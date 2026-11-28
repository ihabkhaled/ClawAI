import type { ChatMessage } from '../../../generated/prisma';
import type { AssembledContext } from './context.types';
import type { LlmResponse, MessageRoutedData, ThreadSettings } from './execution.types';

export type { OversizedFile } from './oversized-file.types';

/** The parts that will be read: all of them, or an even sample when there are too many. */
export type LongInputPlan = {
  total: number;
  picked: Array<{ index: number; text: string }>;
};

/** Everything one reading of oversized files needs. */
export type LongInputReadRequest = {
  context: AssembledContext;
  payload: MessageRoutedData;
  threadSettings: ThreadSettings | undefined;
  request: string;
};

/** Everything a long answer's continuation needs. */
export type LongOutputRequest = {
  response: LlmResponse;
  context: AssembledContext;
  payload: MessageRoutedData;
  threadSettings: ThreadSettings | undefined;
  /** The latest user message: the synthetic turns are built from it. */
  anchor: ChatMessage | undefined;
};

/**
 * What reading produced: the context the answer is written from (notes in place of oversized files), or, when the
 * request is carried out on every part, the finished answer itself.
 */
export type LongInputResult = {
  context: AssembledContext;
  answer: LlmResponse | null;
};
