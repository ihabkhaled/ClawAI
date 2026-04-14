import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { GitHubAdapter } from './github.adapter';
import { SlackAdapter } from './slack.adapter';
import { JiraAdapter } from './jira.adapter';
import { GoogleDriveAdapter } from './google-drive.adapter';
import type { WorkspaceAdapter } from './workspace-adapter.interface';

@Injectable()
export class WorkspaceAdapterFactory {
  constructor(
    private readonly github: GitHubAdapter,
    private readonly slack: SlackAdapter,
    private readonly jira: JiraAdapter,
    private readonly googleDrive: GoogleDriveAdapter,
  ) {}

  getAdapter(provider: WorkspaceProvider | string): WorkspaceAdapter {
    switch (provider) {
      case WorkspaceProvider.GITHUB:
      case WorkspaceProvider.GITLAB:
      case WorkspaceProvider.BITBUCKET:
        return this.github;
      case WorkspaceProvider.SLACK:
        return this.slack;
      case WorkspaceProvider.JIRA:
      case WorkspaceProvider.CONFLUENCE:
        return this.jira;
      case WorkspaceProvider.GOOGLE_DRIVE:
      case WorkspaceProvider.GMAIL:
        return this.googleDrive;
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
