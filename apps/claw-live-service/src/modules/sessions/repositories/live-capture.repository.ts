import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { LiveCaptureTarget } from '../types/live-capture.types';

/** Reads for the browser-capture audio route. The owner is always in the WHERE clause. */
@Injectable()
export class LiveCaptureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTarget(sessionId: string, userId: string): Promise<LiveCaptureTarget | null> {
    const session = await this.prisma.liveViewerSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        state: true,
        runId: true,
        stream: { select: { capability: true } },
        run: { select: { captureSessionId: true } },
      },
    });
    if (!session) return null;
    return {
      sessionId: session.id,
      state: session.state,
      capability: session.stream.capability,
      runId: session.runId,
      captureSessionId: session.run?.captureSessionId ?? null,
    };
  }
}
