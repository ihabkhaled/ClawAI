import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckStatus, ServiceStatus } from '../../../common/enums';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { BinaryService } from '../../binary/services/binary.service';
import { ModelsLifecycleService } from '../../models-lifecycle/services/models-lifecycle.service';
import { SERVICE_VERSION } from '../constants/service-version.constants';
import { type HealthStatus } from '../types/health.types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly binaryService: BinaryService,
    private readonly modelsLifecycle: ModelsLifecycleService,
  ) {}

  async check(): Promise<HealthStatus> {
    this.logger.debug('check: gathering health rollup');
    const dbOk = await this.checkDatabase();
    const binary = this.binaryService.snapshot();
    const activeModel = this.modelsLifecycle.getLoadedSnapshot();
    const status = dbOk ? HealthCheckStatus.OK : HealthCheckStatus.DOWN;

    return {
      status,
      timestamp: new Date().toISOString(),
      binary,
      activeModel,
      version: SERVICE_VERSION,
      services: {
        database: dbOk ? ServiceStatus.UP : ServiceStatus.DOWN,
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`checkDatabase: failed — ${(error as Error).message}`);
      return false;
    }
  }
}
