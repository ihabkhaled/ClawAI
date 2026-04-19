import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { GitHubAdapter } from './github.adapter';
import { SlackAdapter } from './slack.adapter';
import { JiraAdapter } from './jira.adapter';
import { GoogleDriveAdapter } from './google-drive.adapter';
import type { WorkspaceAdapter } from './workspace-adapter.interface';

const NOT_IMPLEMENTED_PROVIDERS = new Set<WorkspaceProvider>([
  WorkspaceProvider.GITLAB,
  WorkspaceProvider.BITBUCKET,
  WorkspaceProvider.CONFLUENCE,
  WorkspaceProvider.GMAIL,
  WorkspaceProvider.FIGMA,
  WorkspaceProvider.CLICKUP,
  WorkspaceProvider.MICROSOFT_SHAREPOINT,
  WorkspaceProvider.MICROSOFT_ONEDRIVE,
]);

@Injectable()
export class WorkspaceAdapterFactory {
  constructor(
    private readonly github: GitHubAdapter,
    private readonly slack: SlackAdapter,
    private readonly jira: JiraAdapter,
    private readonly googleDrive: GoogleDriveAdapter,
  ) {}

  getAdapter(provider: WorkspaceProvider | string): WorkspaceAdapter {
    const typed = provider as WorkspaceProvider;

    if (NOT_IMPLEMENTED_PROVIDERS.has(typed)) {
      throw new BusinessException(
        `Adapter for provider ${provider} is registered but not yet implemented`,
        'ADAPTER_NOT_IMPLEMENTED',
        HttpStatus.NOT_IMPLEMENTED,
        { provider },
      );
    }

    switch (typed) {
      case WorkspaceProvider.GITHUB:
        return this.github;
      case WorkspaceProvider.SLACK:
        return this.slack;
      case WorkspaceProvider.JIRA:
        return this.jira;
      case WorkspaceProvider.GOOGLE_DRIVE:
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
