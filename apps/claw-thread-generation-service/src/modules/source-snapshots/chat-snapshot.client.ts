import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { AppConfig } from '../../app/config/app.config';
import type { ThreadSnapshot } from './types/thread-snapshot.types';

const snapshotSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    sourceThreadId: z.string(),
    title: z.string().nullable(),
    sourceCreatedAt: z.string().datetime(),
    messageCount: z.number().int().nonnegative(),
    byteCount: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    messages: z.array(
      z.object({
        id: z.string(),
        role: z.enum(['USER', 'ASSISTANT']),
        content: z.string(),
        createdAt: z.string().datetime(),
      }),
    ),
  })
  .refine((snapshot) => snapshot.messageCount === snapshot.messages.length, {
    message: 'Snapshot count does not match its messages',
  });

@Injectable()
export class ChatSnapshotClient {
  async getOwnedSnapshot(userId: string, threadId: string): Promise<ThreadSnapshot> {
    const config = AppConfig.get();
    let response: Response;
    try {
      response = await fetch(
        `${config.CHAT_SERVICE_URL}/api/v1/internal/thread-snapshots/${encodeURIComponent(threadId)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
          signal: AbortSignal.timeout(15_000),
        },
      );
    } catch {
      throw new ServiceUnavailableException('Chat snapshot service is unavailable');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Chat snapshot request failed (${String(response.status)})`,
      );
    }
    const parsed = snapshotSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.sourceThreadId !== threadId) {
      throw new ServiceUnavailableException('Chat snapshot response is invalid');
    }
    const { sha256, byteCount, ...snapshotBody } = parsed.data;
    const measuredBytes = Buffer.byteLength(JSON.stringify(snapshotBody), 'utf8');
    const expectedHash = createHash('sha256')
      .update(JSON.stringify({ ...snapshotBody, byteCount }))
      .digest('hex');
    if (byteCount !== measuredBytes || sha256 !== expectedHash) {
      throw new ServiceUnavailableException('Chat snapshot integrity check failed');
    }
    return parsed.data;
  }
}
