import { Module } from '@nestjs/common';
import { MemoryController } from './controllers/memory.controller';
import { MemoryInternalController } from './controllers/memory-internal.controller';
import { MemoryRetrievalController } from './controllers/memory-retrieval.controller';
import { MemoryService } from './services/memory.service';
import { MemoryRetrievalService } from './services/memory-retrieval.service';
import { MemoryExtractionManager } from './managers/memory-extraction.manager';
import { MemorySensitivityManager } from './managers/memory-sensitivity.manager';
import { MemoryRepository } from './repositories/memory.repository';
import { MemorySuggestionRepository } from '../memory-suggestions/repositories/memory-suggestion.repository';
import { MemorySuggestionService } from '../memory-suggestions/services/memory-suggestion.service';
import { MemorySuggestionsController } from '../memory-suggestions/controllers/memory-suggestions.controller';
import { MemoryAuditLogRepository } from '../memory-audit/repositories/memory-audit-log.repository';
import { MemoryAuditService } from '../memory-audit/services/memory-audit.service';
import { MemoryAuditController } from '../memory-audit/controllers/memory-audit.controller';
import { MemoryUsageRepository } from '../memory-usage/repositories/memory-usage.repository';
import { MemoryUsageService } from '../memory-usage/services/memory-usage.service';
import { MemoryUsageController } from '../memory-usage/controllers/memory-usage.controller';
import { MemoryPreferenceRepository } from '../memory-preferences/repositories/memory-preference.repository';
import { MemoryPreferenceService } from '../memory-preferences/services/memory-preference.service';
import { MemoryPreferencesController } from '../memory-preferences/controllers/memory-preferences.controller';

@Module({
  controllers: [
    MemoryController,
    MemoryInternalController,
    MemoryRetrievalController,
    MemorySuggestionsController,
    MemoryAuditController,
    MemoryUsageController,
    MemoryPreferencesController,
  ],
  providers: [
    MemoryService,
    MemoryRetrievalService,
    MemoryExtractionManager,
    MemorySensitivityManager,
    MemoryRepository,
    MemorySuggestionRepository,
    MemorySuggestionService,
    MemoryAuditLogRepository,
    MemoryAuditService,
    MemoryUsageRepository,
    MemoryUsageService,
    MemoryPreferenceRepository,
    MemoryPreferenceService,
  ],
  exports: [MemoryService, MemoryRepository, MemoryRetrievalService],
})
export class MemoryModule {}
