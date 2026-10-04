import { Injectable } from '@nestjs/common';
import { HealthCheckStatus, ServiceStatus } from '@claw/shared-types';
import { THREAD_GENERATION_SERVICE } from '@claw/shared-constants';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

import { type HealthStatus } from '../types/health.types';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const databaseReady = await this.checkDatabase();
    return {
      status: databaseReady ? HealthCheckStatus.OK : HealthCheckStatus.DEGRADED,
      timestamp: new Date().toISOString(),
      service: THREAD_GENERATION_SERVICE,
      services: { database: databaseReady ? ServiceStatus.UP : ServiceStatus.DOWN },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
