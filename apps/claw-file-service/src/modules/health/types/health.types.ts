import { type HealthCheckStatus, type ServiceStatus } from '../../../common/enums';

/**
 * file-service `/health`. health-service's fan-out reads `services.clamav`
 * to drive the "Antivirus scanner" status component, so the key is a
 * contract (see health-service's DEPENDENCY_PROBES). No host, port or error text.
 */
export interface HealthStatus {
  status: HealthCheckStatus;
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    /** clamd `zPING` → `PONG`. DOWN degrades, never fails, this service. */
    clamav: ServiceStatus;
  };
}
