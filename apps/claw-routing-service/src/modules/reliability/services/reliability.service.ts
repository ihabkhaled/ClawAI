import { Injectable } from '@nestjs/common';
import { CircuitBreakerManager } from '../managers/circuit-breaker.manager';
import { type CircuitBreakerSnapshot } from '../types/reliability.types';

@Injectable()
export class ReliabilityService {
  constructor(private readonly cb: CircuitBreakerManager) {}

  async listBreakers(): Promise<CircuitBreakerSnapshot[]> {
    return this.cb.listAll();
  }

  async getBreaker(scope: string): Promise<CircuitBreakerSnapshot> {
    return this.cb.getState(scope);
  }

  async resetBreaker(scope: string): Promise<CircuitBreakerSnapshot> {
    return this.cb.manualReset(scope);
  }
}
