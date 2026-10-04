import { Injectable } from '@nestjs/common';
import { HealthCheckStatus } from '@claw/shared-types';
import { THREADS_SERVICE } from '@claw/shared-constants';

import { type HealthStatus } from '../types/health.types';

@Injectable()
export class HealthService {
  check(): HealthStatus {
    return {
      status: HealthCheckStatus.OK,
      timestamp: new Date().toISOString(),
      service: THREADS_SERVICE,
    };
  }
}
