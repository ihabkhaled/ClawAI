import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import { DEFAULT_AI_ACTION_POLICIES } from '../constants/ai-action-policy.constants';
import { AiActionPolicyRepository } from '../repositories/ai-action-policy.repository';

@Injectable()
export class AiActionDefaultPolicySeederManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiActionDefaultPolicySeederManager.name);

  constructor(private readonly repo: AiActionPolicyRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    let inserted = 0;
    let updated = 0;
    for (const def of DEFAULT_AI_ACTION_POLICIES) {
      const existing = await this.repo.findByName(def.name);
      await this.repo.upsertSystemDefault(def.name, {
        kind: def.kind,
        description: def.description,
        providerRegex: def.providerRegex,
        actionKindRegex: def.actionKindRegex,
        riskMaxLabel: def.riskMaxLabel,
        riskMaxScore: def.riskMaxScore,
        priority: def.priority,
        requireReason: def.requireReason,
        isActive: true,
        isSystemDefault: true,
        createdBy: null,
      });
      if (existing === null) inserted += 1;
      else updated += 1;
    }
    this.logger.log(`seeded default ai-action policies: inserted=${inserted} updated=${updated}`);
  }
}
