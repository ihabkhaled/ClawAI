import { Module } from '@nestjs/common';
import { BitbucketAdapter } from './adapters/bitbucket.adapter';
import { ClickUpAdapter } from './adapters/clickup.adapter';
import { ConfluenceAdapter } from './adapters/confluence.adapter';
import { FigmaAdapter } from './adapters/figma.adapter';
import { GitHubAdapter } from './adapters/github.adapter';
import { GitLabAdapter } from './adapters/gitlab.adapter';
import { GmailAdapter } from './adapters/gmail.adapter';
import { GoogleDriveAdapter } from './adapters/google-drive.adapter';
import { JiraAdapter } from './adapters/jira.adapter';
import { OneDriveAdapter } from './adapters/onedrive.adapter';
import { SharePointAdapter } from './adapters/sharepoint.adapter';
import { SlackAdapter } from './adapters/slack.adapter';
import { WorkspaceAdapterFactory } from './adapters/workspace-adapter.factory';
import { WorkspaceSyncConsumer } from './consumers/workspace-sync.consumer';
import { SyncHealthController } from './controllers/sync-health.controller';
import { SyncHealthInternalController } from './controllers/sync-health-internal.controller';
import { WorkspaceConnectorController } from './controllers/workspace-connector.controller';
import { WorkspaceOAuthController } from './controllers/workspace-oauth.controller';
import { WorkspaceObjectController } from './controllers/workspace-object.controller';
import { WorkspaceProviderRegistryController } from './controllers/workspace-provider-registry.controller';
import { WorkspaceSearchController } from './controllers/workspace-search.controller';
import { WorkspaceSearchInternalController } from './controllers/workspace-search-internal.controller';
import { ConnectorActivationManager } from './managers/connector-activation.manager';
import { OAuthTokenManager } from './managers/oauth-token.manager';
import { OrphanSyncRecoveryManager } from './managers/orphan-sync-recovery.manager';
import { StaleDetectorManager } from './managers/stale-detector.manager';
import { TokenRefreshManager } from './managers/token-refresh.manager';
import { WorkspaceHealthManager } from './managers/workspace-health.manager';
import { WorkspaceObjectManager } from './managers/workspace-object.manager';
import { WorkspaceSearchManager } from './managers/workspace-search.manager';
import { WorkspaceSyncManager } from './managers/workspace-sync.manager';
import { WorkspaceSyncSchedulerManager } from './managers/workspace-sync-scheduler.manager';
import { ProviderAppConfigRepository } from './repositories/provider-app-config.repository';
import { ProviderDefinitionRepository } from './repositories/provider-definition.repository';
import { SyncCadenceRepository } from './repositories/sync-cadence.repository';
import { WorkspaceConnectorRepository } from './repositories/workspace-connector.repository';
import { WorkspaceObjectRepository } from './repositories/workspace-object.repository';
import { ProviderAppConfigService } from './services/provider-app-config.service';
import { ProviderRegistryService } from './services/provider-registry.service';
import { SyncHealthService } from './services/sync-health.service';
import { WorkspaceConnectorService } from './services/workspace-connector.service';
import { WorkspaceObjectService } from './services/workspace-object.service';
import { WorkspaceSearchService } from './services/workspace-search.service';

@Module({
  controllers: [
    WorkspaceConnectorController,
    WorkspaceOAuthController,
    WorkspaceObjectController,
    WorkspaceProviderRegistryController,
    WorkspaceSearchController,
    WorkspaceSearchInternalController,
    SyncHealthController,
    SyncHealthInternalController,
  ],
  providers: [
    WorkspaceConnectorRepository,
    WorkspaceObjectRepository,
    ProviderDefinitionRepository,
    ProviderAppConfigRepository,
    SyncCadenceRepository,
    WorkspaceConnectorService,
    WorkspaceObjectService,
    WorkspaceSearchService,
    ProviderRegistryService,
    ProviderAppConfigService,
    SyncHealthService,
    OAuthTokenManager,
    TokenRefreshManager,
    WorkspaceHealthManager,
    WorkspaceSyncManager,
    WorkspaceSyncSchedulerManager,
    StaleDetectorManager,
    OrphanSyncRecoveryManager,
    WorkspaceObjectManager,
    WorkspaceSearchManager,
    ConnectorActivationManager,
    WorkspaceSyncConsumer,
    WorkspaceAdapterFactory,
    GitHubAdapter,
    GitLabAdapter,
    BitbucketAdapter,
    SlackAdapter,
    JiraAdapter,
    ConfluenceAdapter,
    GoogleDriveAdapter,
    GmailAdapter,
    SharePointAdapter,
    OneDriveAdapter,
    FigmaAdapter,
    ClickUpAdapter,
  ],
  exports: [
    WorkspaceConnectorService,
    WorkspaceObjectService,
    WorkspaceSearchService,
    ProviderRegistryService,
    ProviderAppConfigService,
    SyncHealthService,
    WorkspaceSyncSchedulerManager,
  ],
})
export class WorkspaceModule {}
