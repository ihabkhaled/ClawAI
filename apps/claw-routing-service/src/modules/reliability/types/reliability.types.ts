import { type CircuitBreakerState } from '../../../common/enums';

export type CircuitBreakerRecord = {
  id: string;
  scope: string;
  state: CircuitBreakerState;
  failureCount: number;
  openedAt: Date | null;
  lastTransitionAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CircuitBreakerSnapshot = {
  scope: string;
  state: CircuitBreakerState;
  failureCount: number;
  openedAt: Date | null;
  isAvailable: boolean;
};
