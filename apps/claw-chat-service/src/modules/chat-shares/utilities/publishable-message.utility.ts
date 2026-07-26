import { randomUUID } from 'node:crypto';

import { type PublishableSnapshotMessage, type SnapshotMessage } from '../types/chat-shares.types';

/**
 * Assigns each snapshot message its public identifier.
 *
 * A fresh id per published message, every time. Private message ids are never
 * reused in public output — they are a live handle onto private data, and a
 * stable public id would also let an observer correlate two snapshots of the
 * same conversation.
 *
 * The id is attached to the message here rather than passed as a parallel
 * array, so there is no index to get wrong.
 */
export function withPublicIds(messages: SnapshotMessage[]): PublishableSnapshotMessage[] {
  return messages.map((message) => ({ ...message, publicMessageId: randomUUID() }));
}
