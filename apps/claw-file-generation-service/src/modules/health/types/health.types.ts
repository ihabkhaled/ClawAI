import { type HealthCheckStatus, type ServiceStatus } from '../../../common/enums';

export type HealthStatus = {
  status: HealthCheckStatus;
  timestamp: string;
  services: {
    redis: ServiceStatus;
  };
};
