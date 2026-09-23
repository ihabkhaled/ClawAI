import { Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { GrafanaAccessController } from './controllers/grafana-access.controller';
import { GrafanaAccessService } from './services/grafana-access.service';

/**
 * The cookie that lets an admin's browser reach Grafana through nginx
 * (ADR-115). Its own module because it is neither a login nor a session: it
 * reads the session a login already made, and writes nothing.
 */
@Module({
  imports: [RedisModule],
  controllers: [GrafanaAccessController],
  providers: [GrafanaAccessService],
})
export class GrafanaAccessModule {}
