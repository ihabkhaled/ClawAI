import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import { DEFAULT_TRIGGER_RULES } from '../constants/suggestion-trigger-rules.constants';
import { SuggestionTriggerRuleRepository } from '../repositories/suggestion-trigger-rule.repository';

@Injectable()
export class TriggerRuleSeederManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(TriggerRuleSeederManager.name);

  constructor(private readonly repo: SuggestionTriggerRuleRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    let upserts = 0;
    for (const rule of DEFAULT_TRIGGER_RULES) {
      await this.repo.upsertSystemDefault(rule);
      upserts += 1;
    }
    this.logger.log(`seeded suggestion-factory default trigger rules: ${String(upserts)}`);
  }
}
