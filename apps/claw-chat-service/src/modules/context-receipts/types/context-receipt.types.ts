import type { RetrievalBundle } from '@claw/shared-types';

export type WriteContextReceiptInput = {
  messageId: string;
  threadId: string;
  userId: string;
  bundle: RetrievalBundle;
};
