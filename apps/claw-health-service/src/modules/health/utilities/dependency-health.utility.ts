import { ServiceStatus } from '@claw/shared-types';
import { DEPENDENCY_DOWN_ERROR } from '../constants/health.constants';
import { type DependencyProbe, type ServiceHealthResult } from '../types/health.types';

/**
 * The value `body.services[key]`, when the body has that shape; otherwise
 * undefined. The body is another service's JSON, so nothing about it is assumed.
 */
function reportedStatus(body: unknown, key: string): unknown {
  if (body === null || typeof body !== 'object' || !('services' in body)) {
    return undefined;
  }
  const { services } = body;
  return services !== null && typeof services === 'object'
    ? Object.entries(services).find(([name]) => name === key)?.[1]
    : undefined;
}

/**
 * Rows for dependencies that services report in their own `/health` body
 * (ClamAV via file-service). `bodiesBySource` holds only services that
 * answered. A dependency is UP or DOWN only when its source said so; anything
 * else — disabled, an older source without the key, the source itself down —
 * is "not measured" and yields no row, so it can never read as an outage.
 */
export function deriveDependencyResults(
  probes: readonly DependencyProbe[],
  bodiesBySource: ReadonlyMap<string, unknown>,
): ServiceHealthResult[] {
  const results: ServiceHealthResult[] = [];
  for (const probe of probes) {
    if (!bodiesBySource.has(probe.source)) {
      continue;
    }
    const reported = reportedStatus(bodiesBySource.get(probe.source), probe.key);
    if (reported === ServiceStatus.UP) {
      results.push({
        name: probe.name,
        status: ServiceStatus.UP,
        responseTimeMs: null,
        error: null,
      });
    } else if (reported === ServiceStatus.DOWN) {
      results.push({
        name: probe.name,
        status: ServiceStatus.DOWN,
        responseTimeMs: null,
        error: DEPENDENCY_DOWN_ERROR,
      });
    }
  }
  return results;
}
