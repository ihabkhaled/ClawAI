import { Injectable } from '@nestjs/common';
import { HealthCheckStatus } from '@claw/shared-types';
import { THREADS_SERVICE } from '@claw/shared-constants';

import { type HealthStatus } from '../types/health.types';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    let status = HealthCheckStatus.OK;
    let database: HealthStatus['database'] = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      status = HealthCheckStatus.DOWN;
      database = 'down';
    }
    return {
      status,
      timestamp: new Date().toISOString(),
      service: THREADS_SERVICE,
      database,
    };
  }
}
