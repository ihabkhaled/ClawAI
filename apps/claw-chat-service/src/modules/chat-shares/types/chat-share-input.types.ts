import type { Locale } from '@claw/shared-types';

// Inputs to the share manager.
//
// `userId` is threaded in from the verified JWT by the controller and is never
// part of a request body. A caller able to name an ownerUserId could publish
// somebody else's private conversation.
export type PublishShareInput = {
  threadId: string;
  userId: string;
  allowIndexing: boolean;
  contentLocale?: Locale;
};

export type UpdateShareInput = {
  threadId: string;
  userId: string;
  allowIndexing: boolean;
};
