import { Injectable } from '@nestjs/common';

import { SidecarHealthState } from '../../fetch/enums/sidecar-health-state.enum';
import { SidecarHealthService } from '../../fetch/services/sidecar-health.service';
import { ResearchHealthStatus } from '../enums/research-health-status.enum';
import type { ResearchHealthResponse } from '../types/health.types';

/**
 * Builds research-service `/health`: the service answering at all is "ok";
 * an enabled sidecar that does not answer makes it "degraded", never down —
 * research keeps working on the other tiers. A disabled sidecar changes nothing.
 */
@Injectable()
export class ResearchHealthService {
  constructor(private readonly sidecars: SidecarHealthService) {}

  async check(): Promise<ResearchHealthResponse> {
    const services = await this.sidecars.report();
    const anyDown = Object.values(services).includes(SidecarHealthState.DOWN);
    return {
      status: anyDown ? ResearchHealthStatus.DEGRADED : ResearchHealthStatus.OK,
      service: 'research-service',
      services,
    };
  }
}
