import { Global, Module } from '@nestjs/common';

import { ResearchUsageService } from './research-usage.service';

@Global()
@Module({
  providers: [ResearchUsageService],
  exports: [ResearchUsageService],
})
export class ResearchUsageModule {}
