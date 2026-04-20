import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { BitbucketAdapter } from './bitbucket.adapter';
import { ClickUpAdapter } from './clickup.adapter';
import { ConfluenceAdapter } from './confluence.adapter';
import { FigmaAdapter } from './figma.adapter';
import { GitHubAdapter } from './github.adapter';
import { GitLabAdapter } from './gitlab.adapter';
import { GmailAdapter } from './gmail.adapter';
import { GoogleDriveAdapter } from './google-drive.adapter';
import { JiraAdapter } from './jira.adapter';
import { OneDriveAdapter } from './onedrive.adapter';
import { SharePointAdapter } from './sharepoint.adapter';
import { SlackAdapter } from './slack.adapter';
import type { WorkspaceAdapter } from './workspace-adapter.interface';

@Injectable()
export class WorkspaceAdapterFactory {
  constructor(
    private readonly github: GitHubAdapter,
    private readonly gitlab: GitLabAdapter,
    private readonly bitbucket: BitbucketAdapter,
    private readonly slack: SlackAdapter,
    private readonly jira: JiraAdapter,
    private readonly confluence: ConfluenceAdapter,
    private readonly googleDrive: GoogleDriveAdapter,
    private readonly gmail: GmailAdapter,
    private readonly sharepoint: SharePointAdapter,
    private readonly onedrive: OneDriveAdapter,
    private readonly figma: FigmaAdapter,
    private readonly clickup: ClickUpAdapter,
  ) {}

  getAdapter(provider: WorkspaceProvider | string): WorkspaceAdapter {
    const typed = provider as WorkspaceProvider;
    switch (typed) {
      case WorkspaceProvider.GITHUB:
        return this.github;
      case WorkspaceProvider.GITLAB:
        return this.gitlab;
      case WorkspaceProvider.BITBUCKET:
        return this.bitbucket;
      case WorkspaceProvider.SLACK:
        return this.slack;
      case WorkspaceProvider.JIRA:
        return this.jira;
      case WorkspaceProvider.CONFLUENCE:
        return this.confluence;
      case WorkspaceProvider.GOOGLE_DRIVE:
        return this.googleDrive;
      case WorkspaceProvider.GMAIL:
        return this.gmail;
      case WorkspaceProvider.MICROSOFT_SHAREPOINT:
        return this.sharepoint;
      case WorkspaceProvider.MICROSOFT_ONEDRIVE:
        return this.onedrive;
      case WorkspaceProvider.FIGMA:
        return this.figma;
      case WorkspaceProvider.CLICKUP:
        return this.clickup;
      default:
        throw new BusinessException(
          'workspace.connector.unsupported_provider',
          'UNSUPPORTED_PROVIDER',
          HttpStatus.BAD_REQUEST,
          { provider },
        );
    }
  }
}
