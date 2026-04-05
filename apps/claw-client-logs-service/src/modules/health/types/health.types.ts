import { type HealthCheckStatus, type ServiceStatus } from "../../../common/enums";

export interface HealthStatus {
  status: HealthCheckStatus;
  timestamp: string;
  services: {
    mongodb: ServiceStatus;
    redis: ServiceStatus;
  };
}
