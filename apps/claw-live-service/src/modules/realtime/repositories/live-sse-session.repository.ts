import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { LiveSseSessionView } from '../types/live-sse.types';

/** Read-only view of a viewer session for the SSE stream (ownership in the WHERE clause). */
@Injectable()
export class LiveSseSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwned(sessionId: string, userId: string): Promise<LiveSseSessionView | null> {
    const row = await this.prisma.liveViewerSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, userId: true, runId: true, language: true, state: true },
    });
    if (!row) return null;
    return {
      sessionId: row.id,
      userId: row.userId,
      runId: row.runId,
      language: row.language,
      state: row.state,
    };
  }
}
