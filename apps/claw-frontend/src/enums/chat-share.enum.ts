// Mirrors the chat-service Prisma enums. Duplicated rather than imported
// because the frontend does not depend on backend packages, and a
// string-literal union would violate the no-literal-unions rule.

export enum ChatShareVisibility {
  /** Not shared. The public endpoint answers 404. */
  PRIVATE = 'PRIVATE',
  /** Reachable by URL, never indexed. */
  PUBLIC_UNLISTED = 'PUBLIC_UNLISTED',
  /** Reachable by URL and offered to search engines. */
  PUBLIC_INDEXED = 'PUBLIC_INDEXED',
}

export enum ChatShareStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export enum ChatShareSafetyStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
}

/** Which destructive share action a confirmation dialog is asking about. */
export enum ChatShareConfirmAction {
  DISABLE = 'DISABLE',
  REGENERATE = 'REGENERATE',
}
