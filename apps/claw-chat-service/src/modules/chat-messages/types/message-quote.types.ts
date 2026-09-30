import type { MessageRole } from '../../../generated/prisma';

/** A quote as stored on a user message: provenance first, then the words. */
export type MessageQuote = {
  sourceMessageId: string;
  sourceRole: MessageRole;
  text: string;
};

/** The id and role of a message that can be quoted. */
export type QuotableMessage = {
  id: string;
  role: MessageRole;
};
