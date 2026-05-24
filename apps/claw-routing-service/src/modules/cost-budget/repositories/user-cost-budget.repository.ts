// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)
// Pure data access — uses PrismaService once UserCostBudget model is added.

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserCostBudgetRepository {
  private readonly logger = new Logger(UserCostBudgetRepository.name);

  async findActiveForOwner(_scope: string, _ownerId: string): Promise<unknown | null> {
    throw new Error('SCAFFOLD-R4 — UserCostBudgetRepository.findActiveForOwner not implemented');
  }

  async create(_input: unknown): Promise<unknown> {
    throw new Error('SCAFFOLD-R4 — UserCostBudgetRepository.create not implemented');
  }

  async update(_id: string, _input: unknown): Promise<unknown> {
    throw new Error('SCAFFOLD-R4 — UserCostBudgetRepository.update not implemented');
  }

  async findExpired(_now: Date): Promise<unknown[]> {
    throw new Error('SCAFFOLD-R4 — UserCostBudgetRepository.findExpired not implemented');
  }
}
