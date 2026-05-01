import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  type CapabilityDefaultPolicy,
  DEFAULT_CAPABILITY_POLICIES,
} from '../../../common/constants/capability-policy.constants';
import { DEFAULT_POLICIES } from '../../../common/constants/policy.constants';
import { PolicyRepository } from '../repositories/policy.repository';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class PolicyService implements OnModuleInit {
  private readonly logger = new Logger(PolicyService.name);

  constructor(private readonly repo: PolicyRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
    await this.seedCapabilityDefaults();
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

  /**
   * Stream 10 — seeds the capability framework default policies
   * (filesystem + process + catch-all). Idempotent upsert by name.
   * Marked `isSystemDefault=true` so admin UI can deactivate but not
   * delete.
   */
  async seedCapabilityDefaults(): Promise<void> {
    let ok = 0;
    for (const policy of DEFAULT_CAPABILITY_POLICIES) {
      try {
        await this.repo.upsertByName(policy.name, this.toCreateInput(policy));
        ok += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to upsert capability default policy ${policy.name}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
    this.logger.log(
      `Capability default policies seeded (${String(ok)}/${String(DEFAULT_CAPABILITY_POLICIES.length)})`,
    );
  }

  private toCreateInput(
    policy: CapabilityDefaultPolicy,
  ): Prisma.AccessPolicyCreateInput {
    return {
      name: policy.name,
      kind: policy.kind,
      pattern: policy.pattern,
      scope: policy.scope,
      riskScore: policy.riskScore,
      riskLabel: policy.riskLabel,
      description: policy.description,
      priority: policy.priority,
      isActive: true,
      capabilityClass: policy.capabilityClass ?? null,
      capabilityOperation: policy.capabilityOperation ?? null,
      targetMatcherJson: policy.targetMatcherJson === null
        ? Prisma.JsonNull
        : (policy.targetMatcherJson as Prisma.InputJsonValue),
      autoApproveMaxRiskScore: policy.autoApproveMaxRiskScore ?? null,
      requireReason: policy.requireReason,
      isSystemDefault: true,
    };
  }

  async list(): Promise<Awaited<ReturnType<PolicyRepository['list']>>> {
    return this.repo.list();
  }

  async findActive(): Promise<Awaited<ReturnType<PolicyRepository['findActive']>>> {
    return this.repo.findActive();
  }
}
