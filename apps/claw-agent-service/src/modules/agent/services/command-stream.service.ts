import { Injectable } from '@nestjs/common';
import {
  STREAM_CHUNK_TTL_SECONDS,
  STREAM_KEY_PREFIX,
} from '../../../common/constants/stream.constants';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { StreamChunk } from '../types/stream.types';

@Injectable()
export class CommandStreamService {
  constructor(private readonly redis: RedisService) {}

  private chunksKey(commandId: string): string {
    return `${STREAM_KEY_PREFIX}${commandId}:chunks`;
  }

  private cancelKey(commandId: string): string {
    return `${STREAM_KEY_PREFIX}${commandId}:cancel`;
  }

  async appendChunks(commandId: string, chunks: Omit<StreamChunk, 'seq'>[]): Promise<number> {
    const key = this.chunksKey(commandId);
    const current = await this.redis.llen(key);
    const serialized = chunks.map((chunk, idx) =>
      JSON.stringify({ ...chunk, seq: current + idx + 1 }),
    );
    if (serialized.length === 0) return current;
    await this.redis.rpush(key, ...serialized);
    await this.redis.expire(key, STREAM_CHUNK_TTL_SECONDS);
    return current + serialized.length;
  }

  async readChunks(commandId: string, fromSeq: number): Promise<StreamChunk[]> {
    const key = this.chunksKey(commandId);
    const entries = await this.redis.lrange(key, fromSeq, -1);
    return entries
      .map((entry) => {
        try {
          return JSON.parse(entry) as StreamChunk;
        } catch {
          return null;
        }
      })
      .filter((chunk): chunk is StreamChunk => chunk !== null);
  }

  async totalChunks(commandId: string): Promise<number> {
    return this.redis.llen(this.chunksKey(commandId));
  }

  async requestCancel(commandId: string): Promise<void> {
    await this.redis.set(this.cancelKey(commandId), '1', STREAM_CHUNK_TTL_SECONDS);
  }

  async isCancelRequested(commandId: string): Promise<boolean> {
    return this.redis.exists(this.cancelKey(commandId));
  }

  async clearCancel(commandId: string): Promise<void> {
    await this.redis.del(this.cancelKey(commandId));
  }
}
