import { Module } from '@nestjs/common';
import { ReliabilityController } from './controllers/reliability.controller';
import { ReliabilityService } from './services/reliability.service';
import { CircuitBreakerManager } from './managers/circuit-breaker.manager';
import { CircuitBreakerRepository } from './repositories/circuit-breaker.repository';

@Module({
  controllers: [ReliabilityController],
  providers: [ReliabilityService, CircuitBreakerManager, CircuitBreakerRepository],
  exports: [CircuitBreakerManager, ReliabilityService],
})
export class ReliabilityModule {}
