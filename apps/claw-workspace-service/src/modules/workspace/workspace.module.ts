import { Module } from '@nestjs/common';
import { WorkspaceConnectorRepository } from './repositories/workspace-connector.repository';
import { WorkspaceConnectorService } from './services/workspace-connector.service';
import { WorkspaceConnectorController } from './controllers/workspace-connector.controller';
import { WorkspaceOAuthController } from './controllers/workspace-oauth.controller';
import { OAuthTokenManager } from './managers/oauth-token.manager';
import { WorkspaceHealthManager } from './managers/workspace-health.manager';
import { WorkspaceSyncManager } from './managers/workspace-sync.manager';
import { WorkspaceAdapterFactory } from './adapters/workspace-adapter.factory';
import { GitHubAdapter } from './adapters/github.adapter';
import { SlackAdapter } from './adapters/slack.adapter';
import { JiraAdapter } from './adapters/jira.adapter';
import { GoogleDriveAdapter } from './adapters/google-drive.adapter';

@Module({
  controllers: [WorkspaceConnectorController, WorkspaceOAuthController],
  providers: [
    WorkspaceConnectorRepository,
    WorkspaceConnectorService,
    OAuthTokenManager,
    WorkspaceHealthManager,
    WorkspaceSyncManager,
    WorkspaceAdapterFactory,
    GitHubAdapter,
    SlackAdapter,
    JiraAdapter,
    GoogleDriveAdapter,
  ],
  exports: [WorkspaceConnectorService],
})
export class WorkspaceModule {}
