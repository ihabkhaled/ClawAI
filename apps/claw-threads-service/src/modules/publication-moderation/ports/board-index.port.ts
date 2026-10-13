/** Injection token for the optional Board index; unbound-safe (the revoke flow still works without it). */
export const BOARD_INDEX_PORT = Symbol('BOARD_INDEX_PORT');

export interface BoardIndexPort {
  /** Deletes the publication's search row. Must be idempotent. */
  removePublication(publicationId: string): Promise<void>;
}
