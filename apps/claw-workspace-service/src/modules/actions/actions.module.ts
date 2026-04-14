import { Module } from '@nestjs/common';
import { WorkspaceActionRepository } from './repositories/workspace-action.repository';
import { ActionExecutionManager } from './managers/action-execution.manager';
import { WorkspaceActionService } from './services/workspace-action.service';
import { WorkspaceActionController } from './controllers/workspace-action.controller';
import { WorkspaceConnectorRepository } from '../workspace/repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../workspace/adapters/workspace-adapter.factory';
import { OAuthTokenManager } from '../workspace/managers/oauth-token.manager';
import { GitHubAdapter } from '../workspace/adapters/github.adapter';
import { SlackAdapter } from '../workspace/adapters/slack.adapter';
import { JiraAdapter } from '../workspace/adapters/jira.adapter';
import { GoogleDriveAdapter } from '../workspace/adapters/google-drive.adapter';

@Module({
  controllers: [WorkspaceActionController],
  providers: [
    WorkspaceActionRepository,
    WorkspaceConnectorRepository,
    ActionExecutionManager,
    WorkspaceActionService,
    WorkspaceAdapterFactory,
    OAuthTokenManager,
    GitHubAdapter,
    SlackAdapter,
    JiraAdapter,
    GoogleDriveAdapter,
  ],
})
export class ActionsModule {}
