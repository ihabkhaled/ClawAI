import type { ChannelMessage } from '../types/channel.types';

/**
 * The inbox storage seam. The service depends on this, so its tests run
 * against an in-memory store instead of Redis.
 */
export abstract class ChannelInboxStore {
  abstract append(userId: string, message: ChannelMessage): Promise<void>;
  /** Every stored entry for the owner, oldest first, as serialized. */
  abstract listRaw(userId: string): Promise<string[]>;
  /** Removes one exact serialized entry; false when it was already gone. */
  abstract removeRaw(userId: string, raw: string): Promise<boolean>;
}
