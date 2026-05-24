// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)
// Pure data access — uses PrismaService once UserCostBudget model is added.
// Per repository rule: NO throws. Return null/empty until implemented.

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserCostBudgetRepository {
  private readonly logger = new Logger(UserCostBudgetRepository.name);

  async findActiveForOwner(_scope: string, _ownerId: string): Promise<unknown | null> {
    this.logger.warn('UserCostBudgetRepository.findActiveForOwner: SCAFFOLD-R4 returns null');
    return null;
  }

  async create(_input: unknown): Promise<unknown | null> {
    this.logger.warn('UserCostBudgetRepository.create: SCAFFOLD-R4 returns null');
    return null;
  }

  async update(_id: string, _input: unknown): Promise<unknown | null> {
    this.logger.warn('UserCostBudgetRepository.update: SCAFFOLD-R4 returns null');
    return null;
  }

  async findExpired(_now: Date): Promise<unknown[]> {
    this.logger.warn('UserCostBudgetRepository.findExpired: SCAFFOLD-R4 returns empty');
    return [];
  }
}
