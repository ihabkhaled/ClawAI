import { Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { ReliabilityService } from '../services/reliability.service';
import { type CircuitBreakerSnapshot } from '../types/reliability.types';

@Controller('routing/circuit-breakers')
export class ReliabilityController {
  constructor(private readonly service: ReliabilityService) {}

  @Get()
  async list(): Promise<{ data: CircuitBreakerSnapshot[] }> {
    const data = await this.service.listBreakers();
    return { data };
  }

  @Get(':scope')
  async getOne(@Param('scope') scope: string): Promise<CircuitBreakerSnapshot> {
    return this.service.getBreaker(scope);
  }

  @Post(':scope/reset')
  @Roles(UserRole.ADMIN)
  async reset(@Param('scope') scope: string): Promise<CircuitBreakerSnapshot> {
    return this.service.resetBreaker(scope);
  }
}
