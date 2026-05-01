import { Injectable, Logger } from '@nestjs/common';
import { type LoadEventType } from '../../../common/enums';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class LoadEventsRepository {
  private readonly logger = new Logger(LoadEventsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(payload: {
    modelId: string;
    eventType: LoadEventType;
    pid?: number | null;
    port?: number | null;
    errorMessage?: string | null;
  }): Promise<void> {
    this.logger.log(`record: model=${payload.modelId} event=${payload.eventType}`);
    await this.prisma.modelLoadEvent.create({
      data: {
        modelId: payload.modelId,
        eventType: payload.eventType,
        pid: payload.pid ?? null,
        port: payload.port ?? null,
        errorMessage: payload.errorMessage ?? null,
      },
    });
  }
}
