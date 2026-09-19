import { Module } from '@nestjs/common';

import { AdminOpsTokenController } from './controllers/admin-ops-token.controller';
import { OpsTokenInternalController } from './controllers/ops-token-internal.controller';
import { OpsTokenRepository } from './repositories/ops-token.repository';
import { OpsTokenService } from './services/ops-token.service';

@Module({
  controllers: [AdminOpsTokenController, OpsTokenInternalController],
  providers: [OpsTokenService, OpsTokenRepository],
})
export class OpsTokensModule {}
