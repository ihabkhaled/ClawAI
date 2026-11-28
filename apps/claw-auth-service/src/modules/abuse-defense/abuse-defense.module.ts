import { Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AntiAbuseCounterRepository } from '../anti-abuse/repositories/anti-abuse-counter.repository';
import { UserDeviceRepository } from '../anti-abuse/repositories/user-device.repository';
import { SessionRevocationCacheService } from '../auth/services/session-revocation-cache.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { AbuseSignalsInternalController } from './controllers/abuse-signals-internal.controller';
import { AdminAbuseController } from './controllers/admin-abuse.controller';
import { AbuseSignalRepository } from './repositories/abuse-signal.repository';
import { AbuseSuspensionRepository } from './repositories/abuse-suspension.repository';
import { BannedDeviceRepository } from './repositories/banned-device.repository';
import { AbuseAdminService } from './services/abuse-admin.service';
import { AbuseAuditService } from './services/abuse-audit.service';
import { AbuseSettingsService } from './services/abuse-settings.service';
import { AbuseSignalService } from './services/abuse-signal.service';
import { AbuseSuspensionService } from './services/abuse-suspension.service';
import { BannedDeviceService } from './services/banned-device.service';

/**
 * The response to abuse by an authenticated account (ADR-233): counted signals with admin-set
 * thresholds, an automatic suspension on a 1 h / 24 h / 7 d ladder, and banned-device marks.
 *
 * Sits BELOW AuthModule and UsersModule (both import it), so it imports neither: the three
 * stateless providers it shares with them (UsersRepository, SessionRevocationCacheService and the
 * anti-abuse counters and device repository) are provided here again, the same way AuthModule
 * already provides UsersRepository.
 */
@Module({
  imports: [SystemSettingsModule, RedisModule],
  controllers: [AbuseSignalsInternalController, AdminAbuseController],
  providers: [
    AntiAbuseCounterRepository,
    UserDeviceRepository,
    UsersRepository,
    SessionRevocationCacheService,
    AbuseSignalRepository,
    AbuseSuspensionRepository,
    BannedDeviceRepository,
    AbuseSettingsService,
    AbuseAuditService,
    AbuseSuspensionService,
    AbuseSignalService,
    BannedDeviceService,
    AbuseAdminService,
  ],
  exports: [AbuseSignalService, AbuseSuspensionService, BannedDeviceService],
})
export class AbuseDefenseModule {}
