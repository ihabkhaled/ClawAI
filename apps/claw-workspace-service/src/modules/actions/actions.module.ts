import { Module } from '@nestjs/common';
import { WorkspaceActionRepository } from './repositories/workspace-action.repository';
import { ActionExecutionManager } from './managers/action-execution.manager';
import { WorkspaceActionService } from './services/workspace-action.service';
import { WorkspaceActionController } from './controllers/workspace-action.controller';
import { WorkspaceConnectorRepository } from '../workspace/repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../workspace/adapters/workspace-adapter.factory';
import { OAuthTokenManager } from '../workspace/managers/oauth-token.manager';
import { TokenRefreshManager } from '../workspace/managers/token-refresh.manager';
import { ProviderAppConfigRepository } from '../workspace/repositories/provider-app-config.repository';
import { ProviderDefinitionRepository } from '../workspace/repositories/provider-definition.repository';
import { ProviderAppConfigService } from '../workspace/services/provider-app-config.service';
import { ProviderRegistryService } from '../workspace/services/provider-registry.service';
import { BitbucketAdapter } from '../workspace/adapters/bitbucket.adapter';
import { ClickUpAdapter } from '../workspace/adapters/clickup.adapter';
import { ConfluenceAdapter } from '../workspace/adapters/confluence.adapter';
import { FigmaAdapter } from '../workspace/adapters/figma.adapter';
import { GitHubAdapter } from '../workspace/adapters/github.adapter';
import { GitLabAdapter } from '../workspace/adapters/gitlab.adapter';
import { GmailAdapter } from '../workspace/adapters/gmail.adapter';
import { GoogleDriveAdapter } from '../workspace/adapters/google-drive.adapter';
import { JiraAdapter } from '../workspace/adapters/jira.adapter';
import { OneDriveAdapter } from '../workspace/adapters/onedrive.adapter';
import { SharePointAdapter } from '../workspace/adapters/sharepoint.adapter';
import { SlackAdapter } from '../workspace/adapters/slack.adapter';

@Module({
  controllers: [WorkspaceActionController],
  providers: [
    WorkspaceActionRepository,
    WorkspaceConnectorRepository,
    ActionExecutionManager,
    WorkspaceActionService,
    WorkspaceAdapterFactory,
    OAuthTokenManager,
    TokenRefreshManager,
    ProviderAppConfigRepository,
    ProviderDefinitionRepository,
    ProviderAppConfigService,
    ProviderRegistryService,
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
})
export class ActionsModule {}
