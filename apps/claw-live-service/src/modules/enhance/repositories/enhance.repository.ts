import { Injectable } from '@nestjs/common';

import { LiveChargeKind } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { EnhanceEventRow, NewEnhancement, StoredEnhancement } from '../types/enhance.types';

@Injectable()
export class EnhanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEvent(eventId: string): Promise<EnhanceEventRow | null> {
    return this.prisma.liveFeedEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        runId: true,
        version: true,
        startAt: true,
        endAt: true,
        title: true,
        body: true,
        evidence: true,
      },
    });
  }

  findByRequestId(requestId: string): Promise<StoredEnhancement | null> {
    return this.prisma.liveEnhancement.findUnique({ where: { requestId } });
  }

  /**
   * Stores the answer and its ENHANCEMENT charge together. The charge row mirrors what the user's
   * wallet paid through chat-service; it is immutable and keyed by the request, so a replay adds nothing.
   */
  save(input: NewEnhancement): Promise<StoredEnhancement> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.liveEnhancement.create({
        data: {
          userId: input.userId,
          sessionId: input.sessionId,
          eventId: input.eventId,
          eventVersion: input.eventVersion,
          modelId: input.modelId,
          body: input.body,
          costMicroUsd: BigInt(input.costMicroUsd),
          requestId: input.requestId,
        },
      });
      await tx.liveUsageCharge.create({
        data: {
          idempotencyKey: `enhance:${input.requestId}`,
          userId: input.userId,
          sessionId: input.sessionId,
          runId: input.runId,
          kind: LiveChargeKind.ENHANCEMENT,
          microUsd: BigInt(input.costMicroUsd),
          policyVersion: input.policyVersion,
        },
      });
      return row;
    });
  }
}
