import { Module } from '@nestjs/common';

import { ServerLogsModule } from '../server-logs/server-logs.module';
import { OpsLogsController } from './controllers/ops-logs.controller';
import { OpsTokenGuard } from './guards/ops-token.guard';

@Module({
  imports: [ServerLogsModule],
  controllers: [OpsLogsController],
  providers: [OpsTokenGuard],
})
export class OpsModule {}
