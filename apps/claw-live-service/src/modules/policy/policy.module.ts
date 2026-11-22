import { Global, Module } from '@nestjs/common';

import { LivePolicyService } from './services/live-policy.service';

@Global()
@Module({
  providers: [LivePolicyService],
  exports: [LivePolicyService],
})
export class PolicyModule {}
