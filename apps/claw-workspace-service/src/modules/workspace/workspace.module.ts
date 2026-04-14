import { Module } from '@nestjs/common';
import { WorkspaceConnectorRepository } from './repositories/workspace-connector.repository';
import { WorkspaceObjectRepository } from './repositories/workspace-object.repository';
import { WorkspaceConnectorService } from './services/workspace-connector.service';
import { WorkspaceObjectService } from './services/workspace-object.service';
import { WorkspaceConnectorController } from './controllers/workspace-connector.controller';
import { WorkspaceOAuthController } from './controllers/workspace-oauth.controller';
import { WorkspaceObjectController } from './controllers/workspace-object.controller';
import { OAuthTokenManager } from './managers/oauth-token.manager';
import { WorkspaceHealthManager } from './managers/workspace-health.manager';
import { WorkspaceSyncManager } from './managers/workspace-sync.manager';
import { WorkspaceObjectManager } from './managers/workspace-object.manager';
import { WorkspaceAdapterFactory } from './adapters/workspace-adapter.factory';
import { GitHubAdapter } from './adapters/github.adapter';
import { SlackAdapter } from './adapters/slack.adapter';
import { JiraAdapter } from './adapters/jira.adapter';
import { GoogleDriveAdapter } from './adapters/google-drive.adapter';

@Module({
  controllers: [WorkspaceConnectorController, WorkspaceOAuthController, WorkspaceObjectController],
  providers: [
    WorkspaceConnectorRepository,
    WorkspaceObjectRepository,
    WorkspaceConnectorService,
    WorkspaceObjectService,
    OAuthTokenManager,
    WorkspaceHealthManager,
    WorkspaceSyncManager,
    WorkspaceObjectManager,
    WorkspaceAdapterFactory,
    GitHubAdapter,
    SlackAdapter,
    JiraAdapter,
    GoogleDriveAdapter,
  ],
  exports: [WorkspaceConnectorService, WorkspaceObjectService],
})
export class WorkspaceModule {}
