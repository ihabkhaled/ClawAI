import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SessionAdminController } from './controllers/session-admin.controller';
import { SessionGlobalController } from './controllers/session-global.controller';
import { SessionAdminRepository } from './repositories/session-admin.repository';
import { SessionAdminService } from './services/session-admin.service';
import { SessionGlobalGuardService } from './services/session-global-guard.service';
import { SessionGlobalService } from './services/session-global.service';

/** Admin view of logins, per-user termination and the two-step system-wide actions (ADR-204). */
@Module({
  imports: [AuthModule, UsersModule, RedisModule],
  controllers: [SessionAdminController, SessionGlobalController],
  providers: [
    SessionAdminRepository,
    SessionAdminService,
    SessionGlobalGuardService,
    SessionGlobalService,
  ],
})
export class SessionsModule {}
