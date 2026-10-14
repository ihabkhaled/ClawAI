/** Where an in-chat consent request is. Mirrors the Prisma enum; PENDING is the only state a user can decide from. */
export enum ConsentRequestState {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
  CONSUMED = 'CONSUMED',
}
