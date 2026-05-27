import { Module } from '@nestjs/common';
import { OllamaController } from './ollama.controller';
import { OllamaDiscoveryController } from './ollama-discovery.controller';
import { OllamaInternalController } from './ollama-internal.controller';
import { OllamaService } from './ollama.service';
import { OllamaManager } from './managers/ollama.manager';
import { CandidateImportManager } from './managers/candidate-import.manager';
import { DiscoveryManager } from './managers/discovery.manager';
import { ModelEnrichmentManager } from './managers/model-enrichment.manager';
import { OllamaLibraryDiscoveryManager } from './managers/ollama-library-discovery.manager';
import { PullJobResumeManager } from './managers/pull-job-resume.manager';
import { RoutingSnapshotManager } from './managers/routing-snapshot.manager';
import { LocalModelsRepository } from './repositories/local-models.repository';
import { RoleAssignmentsRepository } from './repositories/role-assignments.repository';
import { PullJobsRepository } from './repositories/pull-jobs.repository';
import { RuntimeConfigsRepository } from './repositories/runtime-configs.repository';
import { ModelCatalogRepository } from './repositories/model-catalog.repository';
import { DiscoveryCandidateRepository } from './repositories/discovery-candidate.repository';
import { DiscoveryRunRepository } from './repositories/discovery-run.repository';
import { DiscoverySourceRepository } from './repositories/discovery-source.repository';
import { CatalogClassificationService } from './services/catalog-classification.service';
import { CatalogSeedService } from './services/catalog-seed.service';
import { CatalogRemoteMetadataService } from './services/catalog-remote-metadata.service';
import { CatalogSyncService } from './services/catalog-sync.service';
import { DiscoveryJobService } from './services/discovery-job.service';
import { DiscoverySourceService } from './services/discovery-source.service';
import { HardwarePackService } from './services/hardware-pack.service';

@Module({
  controllers: [OllamaController, OllamaDiscoveryController, OllamaInternalController],
  providers: [
    OllamaService,
    OllamaManager,
    CandidateImportManager,
    DiscoveryManager,
    ModelEnrichmentManager,
    OllamaLibraryDiscoveryManager,
    PullJobResumeManager,
    RoutingSnapshotManager,
    LocalModelsRepository,
    RoleAssignmentsRepository,
    PullJobsRepository,
    RuntimeConfigsRepository,
    ModelCatalogRepository,
    DiscoveryCandidateRepository,
    DiscoveryRunRepository,
    DiscoverySourceRepository,
    CatalogClassificationService,
    CatalogSeedService,
    CatalogRemoteMetadataService,
    CatalogSyncService,
    DiscoveryJobService,
    DiscoverySourceService,
    HardwarePackService,
  ],
  exports: [OllamaService],
})
export class OllamaModule {}
