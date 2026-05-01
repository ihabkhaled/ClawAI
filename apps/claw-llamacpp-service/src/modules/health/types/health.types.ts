import { type HealthCheckStatus, type ServiceStatus } from '../../../common/enums';

export interface BinaryHealth {
  version: string | null;
  platform: string | null;
  path: string | null;
  installed: boolean;
}

export interface ActiveModelHealth {
  id: string;
  name: string;
  tag: string;
  loadStatus: string;
  port: number | null;
}

export interface HealthStatus {
  status: HealthCheckStatus;
  timestamp: string;
  binary: BinaryHealth;
  activeModel: ActiveModelHealth | null;
  version: string;
  services: {
    database: ServiceStatus;
  };
}
