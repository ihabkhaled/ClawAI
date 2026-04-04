import { type HealthCheckStatus, type ServiceStatus } from "../../../common/enums";

export interface HealthStatus {
  status: HealthCheckStatus;
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}
