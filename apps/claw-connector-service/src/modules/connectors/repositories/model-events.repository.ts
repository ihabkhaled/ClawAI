import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreateModelEventData, type ModelVisibilityEvent } from '../types/connectors.types';

/** The trail of what syncs changed on models (`connector_model_events`). */
@Injectable()
export class ModelEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(events: CreateModelEventData[]): Promise<number> {
    if (events.length === 0) return 0;
    const result = await this.prisma.connectorModelEvent.createMany({ data: events });
    return result.count;
  }

  // Newest first, for one model on the given connectors.
  async findRecent(
    connectorIds: string[],
    modelKey: string,
    limit: number,
  ): Promise<ModelVisibilityEvent[]> {
    return this.prisma.connectorModelEvent.findMany({
      where: { connectorId: { in: connectorIds }, modelKey },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        type: true,
        beforeKind: true,
        afterKind: true,
        beforeExposure: true,
        afterExposure: true,
        reason: true,
        createdAt: true,
      },
    });
  }
}
