/** Open (PENDING) suggestions one person may have on one Thread at a time. */
export const MAX_PENDING_CHANGE_REQUESTS_PER_USER = 3;

/** Open (PENDING) suggestions one Thread may hold at a time, from everyone. */
export const MAX_PENDING_CHANGE_REQUESTS_PER_PUBLICATION = 50;

export const CHANGE_REQUEST_SUGGESTION_MAX_LENGTH = 5000;

/** Rows returned by the owner review list and by "My suggestions". */
export const CHANGE_REQUEST_LIST_LIMIT = 200;

/** People named in "Improved with suggestions from ..." on the public Thread page. */
export const CHANGE_REQUEST_CREDIT_LIMIT = 20;

/** The columns of a suggestion that the owner review and the reader's own list show. */
export const CHANGE_REQUEST_VIEW_SELECT = {
  id: true,
  suggestion: true,
  status: true,
  ownerResponse: true,
  acceptedRevisionId: true,
  createdAt: true,
} as const;
