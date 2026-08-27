import { type MessageRole } from '../../../generated/prisma';

/**
 * One match inside a thread.
 *
 * A snippet rather than the whole message: the caller is rendering a jump-to
 * list, and shipping full bodies to draw one-line previews wastes the payload
 * on both sides.
 */
export interface InThreadSearchMatch {
  messageId: string;
  role: MessageRole;
  /** Text around the match, with an ellipsis where it was cut. */
  snippet: string;
  createdAt: string;
}
