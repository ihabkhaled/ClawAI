import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DEFAULT_POLICIES } from '../../../common/constants/policy.constants';
import { PolicyRepository } from '../repositories/policy.repository';

@Injectable()
export class PolicyService implements OnModuleInit {
  private readonly logger = new Logger(PolicyService.name);

  constructor(private readonly repo: PolicyRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async seedDefaults(): Promise<void> {
    for (const policy of DEFAULT_POLICIES) {
      try {
        await this.repo.upsertByName(policy.name, {
          name: policy.name,
          kind: policy.kind,
          pattern: policy.pattern,
          description: policy.description,
          priority: policy.priority,
          riskScore: policy.riskScore,
          riskLabel: policy.riskLabel,
          isActive: true,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to upsert default policy ${policy.name}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
    this.logger.log(`Default policies seeded (${DEFAULT_POLICIES.length})`);
  }

  async list(): Promise<Awaited<ReturnType<PolicyRepository['list']>>> {
    return this.repo.list();
  }

  async findActive(): Promise<Awaited<ReturnType<PolicyRepository['findActive']>>> {
    return this.repo.findActive();
  }
}
