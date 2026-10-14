import { Module } from '@nestjs/common';

import { HostRulePolicyManager } from './managers/host-rule-policy.manager';
import { HostRulesRepository } from './repositories/host-rules.repository';

/** A leaf module (database only) so the user-server code can import the policy without a cycle. */
@Module({
  providers: [HostRulesRepository, HostRulePolicyManager],
  exports: [HostRulesRepository, HostRulePolicyManager],
})
export class HostRulesModule {}
