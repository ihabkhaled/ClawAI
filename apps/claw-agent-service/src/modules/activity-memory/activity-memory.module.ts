import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { ActivityMemoryController } from './controllers/activity-memory.controller';
import { ActivityMemoryRepository } from './repositories/activity-memory.repository';

/**
 * Stream 41 — Activity memory.
 *
 * Cloud-side mirror for the local-first activity log on each device.
 * Per the framework rules, activity entries default to local-only;
 * `syncedToCloud=true` is opt-in per record. The CLI will write to a
 * SQLCipher-encrypted local SQLite first, then push only opt-in rows
 * to this endpoint via the existing device-token auth.
 *
 * SQLCipher integration on the CLI side is a v2 follow-up (needs a
 * native binding bundled per OS). The cloud-side schema and endpoints
 * are ready and tested.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ActivityMemoryController],
  providers: [ActivityMemoryRepository],
  exports: [ActivityMemoryRepository],
})
export class ActivityMemoryModule {}
