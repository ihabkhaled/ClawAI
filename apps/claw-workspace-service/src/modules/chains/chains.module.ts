import { Module } from '@nestjs/common';

import { ConnectorGrantRepository } from '../connector-access/repositories/connector-grant.repository';
import { ConnectorAccessService } from '../connector-access/services/connector-access.service';
import { BitbucketAdapter } from '../workspace/adapters/bitbucket.adapter';
import { ClickUpAdapter } from '../workspace/adapters/clickup.adapter';
import { ConfluenceAdapter } from '../workspace/adapters/confluence.adapter';
import { FigmaAdapter } from '../workspace/adapters/figma.adapter';
import { GitHubAdapter } from '../workspace/adapters/github.adapter';
import { GitHubWriteActionsHelper } from '../workspace/adapters/github-write-actions.helper';
import { GitLabAdapter } from '../workspace/adapters/gitlab.adapter';
import { GitLabWriteActionsHelper } from '../workspace/adapters/gitlab-write-actions.helper';
import { GmailAdapter } from '../workspace/adapters/gmail.adapter';
import { GmailAttachmentHelper } from '../workspace/adapters/gmail-attachment.helper';
import { GmailComposeHelper } from '../workspace/adapters/gmail-compose.helper';
import { GoogleCalendarAdapter } from '../workspace/adapters/google-calendar.adapter';
import { GoogleDriveAdapter } from '../workspace/adapters/google-drive.adapter';
import { JiraAdapter } from '../workspace/adapters/jira.adapter';
import { OneDriveAdapter } from '../workspace/adapters/onedrive.adapter';
import { OutlookCalendarAdapter } from '../workspace/adapters/outlook-calendar.adapter';
import { SharePointAdapter } from '../workspace/adapters/sharepoint.adapter';
import { SlackAdapter } from '../workspace/adapters/slack.adapter';
import { WorkspaceAdapterFactory } from '../workspace/adapters/workspace-adapter.factory';
import { OAuthTokenManager } from '../workspace/managers/oauth-token.manager';
import { TokenRefreshManager } from '../workspace/managers/token-refresh.manager';
import { ProviderAppConfigRepository } from '../workspace/repositories/provider-app-config.repository';
import { ProviderDefinitionRepository } from '../workspace/repositories/provider-definition.repository';
import { WorkspaceConnectorRepository } from '../workspace/repositories/workspace-connector.repository';
import { ProviderAppConfigService } from '../workspace/services/provider-app-config.service';
import { ProviderRegistryService } from '../workspace/services/provider-registry.service';
import { ChainController } from './controllers/chain.controller';
import { ChainTemplateController } from './controllers/chain-template.controller';
import { ChainExecutorManager } from './managers/chain-executor.manager';
import { ChainOrphanRunRecoveryManager } from './managers/chain-orphan-run-recovery.manager';
import { ChainRepository } from './repositories/chain.repository';
import { ChainTemplateRepository } from './repositories/chain-template.repository';
import { ChainTemplateService } from './services/chain-template.service';
import { ChainService } from './services/chain.service';

// v3 round 12 (2026-05-14) — Prompt 11: cross-workspace automation
// chains. Declares the adapter-factory dependency graph the executor
// needs (same pattern as ActionsModule) so a chain step can call any
// provider's executeWriteAction.
@Module({
  controllers: [ChainController, ChainTemplateController],
  providers: [
    ChainRepository,
    ChainService,
    ChainExecutorManager,
    ChainOrphanRunRecoveryManager,
    ChainTemplateRepository,
    ChainTemplateService,
    // Connector + adapter graph the executor calls into.
    WorkspaceConnectorRepository,
    WorkspaceAdapterFactory,
    OAuthTokenManager,
    TokenRefreshManager,
    ProviderAppConfigRepository,
    ProviderDefinitionRepository,
    ProviderAppConfigService,
    ProviderRegistryService,
    ConnectorAccessService,
    ConnectorGrantRepository,
    GitHubAdapter,
    GitHubWriteActionsHelper,
    GitLabAdapter,
    GitLabWriteActionsHelper,
    BitbucketAdapter,
    SlackAdapter,
    JiraAdapter,
    ConfluenceAdapter,
    GoogleDriveAdapter,
    GmailAdapter,
    GmailAttachmentHelper,
    GmailComposeHelper,
    SharePointAdapter,
    OneDriveAdapter,
    FigmaAdapter,
    ClickUpAdapter,
    GoogleCalendarAdapter,
    OutlookCalendarAdapter,
  ],
  exports: [ChainService],
})
export class ChainsModule {}
