import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { ActivityMemoryController } from './controllers/activity-memory.controller';
import { AgentSuggestionController } from './controllers/agent-suggestion.controller';
import { AgentSuggestionManager } from './managers/agent-suggestion.manager';
import { ActivityMemoryRepository } from './repositories/activity-memory.repository';
import { AgentSuggestionRepository } from './repositories/agent-suggestion.repository';

/**
 * Stream 41 — Activity memory.
 *
 * Cloud-side mirror for the local-first activity log on each device.
 * Per the framework rules, activity entries default to local-only;
 * `syncedToCloud=true` is opt-in per record. The CLI will write to a
 * SQLCipher-encrypted local SQLite first, then push only opt-in rows
 * to this endpoint via the existing device-token auth.
 *
 * V2 Stream 05 adds:
 *   - CLI background `runCloudSyncLoop` drains unsynced rows to the
 *     mirror endpoint (gated on `CLAW_ACTIVITY_CLOUD_SYNC=true`).
 *   - `AgentSuggestionManager` scans activity rows on cron and emits
 *     PENDING `AgentSuggestion` rows once an activity kind crosses
 *     the SUGGESTION_MIN_OCCURRENCES threshold in the rolling 7-day
 *     window. Exposed via `/agent/suggestions`.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ActivityMemoryController, AgentSuggestionController],
  providers: [ActivityMemoryRepository, AgentSuggestionRepository, AgentSuggestionManager],
  exports: [ActivityMemoryRepository, AgentSuggestionRepository],
})
export class ActivityMemoryModule {}
