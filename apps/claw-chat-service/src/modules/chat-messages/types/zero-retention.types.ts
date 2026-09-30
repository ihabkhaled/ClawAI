import type { Prisma } from '../../../generated/prisma';

/** Which messages belong to the turn being purged. Always scoped to one thread. */
export type ZeroRetentionTurnFilter =
  | { readonly threadId: string; readonly runId: string }
  | { readonly threadId: string; readonly userMessageId: string };

/** The only columns a purge reads back. */
export interface ZeroRetentionMessageRow {
  readonly id: string;
  readonly metadata: Prisma.JsonValue | null;
}

/**
 * The slice of `PrismaService` the zero-retention repository uses. Injected as
 * `PrismaService`; narrowed so the repository cannot reach any other table.
 */
export interface ZeroRetentionPrismaPort {
  readonly chatMessage: {
    findMany(args: {
      where: Prisma.ChatMessageWhereInput;
      select: { id: true; metadata: true };
    }): Promise<ZeroRetentionMessageRow[]>;
    update(args: {
      where: { id: string };
      data: { content: string; originalContent: null; metadata: Prisma.InputJsonValue };
    }): Promise<unknown>;
  };
}

/** The slice of `RedisService` the marker store uses. */
export interface ZeroRetentionRedisPort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}
