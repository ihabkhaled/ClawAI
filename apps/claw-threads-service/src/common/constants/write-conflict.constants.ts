/** P2034: the transaction lost a write conflict. P2002: an upsert raced another insert of the same row. */
export const RETRYABLE_PRISMA_CODES: readonly string[] = ['P2034', 'P2002'];
