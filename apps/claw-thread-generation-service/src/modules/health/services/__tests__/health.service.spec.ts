import { HealthCheckStatus } from '@claw/shared-types';
import { THREAD_GENERATION_SERVICE } from '@claw/shared-constants';

import { HealthService } from '../health.service';

describe('HealthService', () => {
  it('reports the generation service as healthy', () => {
    const result = new HealthService().check();

    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.service).toBe(THREAD_GENERATION_SERVICE);
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
