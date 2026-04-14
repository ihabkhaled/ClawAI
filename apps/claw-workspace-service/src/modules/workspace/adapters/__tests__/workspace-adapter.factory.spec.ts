import { WorkspaceAdapterFactory } from '../workspace-adapter.factory';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { GitHubAdapter } from '../github.adapter';
import { SlackAdapter } from '../slack.adapter';
import { JiraAdapter } from '../jira.adapter';
import { GoogleDriveAdapter } from '../google-drive.adapter';
import { BusinessException } from '../../../../common/errors/business.exception';

describe('WorkspaceAdapterFactory', () => {
  let factory: WorkspaceAdapterFactory;
  const github = new GitHubAdapter();
  const slack = new SlackAdapter();
  const jira = new JiraAdapter();
  const googleDrive = new GoogleDriveAdapter();

  beforeEach(() => {
    factory = new WorkspaceAdapterFactory(github, slack, jira, googleDrive);
  });

  it.each([
    [WorkspaceProvider.GITHUB, github],
    [WorkspaceProvider.GITLAB, github],
    [WorkspaceProvider.BITBUCKET, github],
    [WorkspaceProvider.SLACK, slack],
    [WorkspaceProvider.JIRA, jira],
    [WorkspaceProvider.CONFLUENCE, jira],
    [WorkspaceProvider.GOOGLE_DRIVE, googleDrive],
    [WorkspaceProvider.GMAIL, googleDrive],
  ])('should return correct adapter for %s', (provider, expected) => {
    expect(factory.getAdapter(provider)).toBe(expected);
  });

  it('should throw BusinessException for unsupported provider', () => {
    expect(() => factory.getAdapter('UNSUPPORTED' as WorkspaceProvider)).toThrow(BusinessException);
  });

  it.each([
    WorkspaceProvider.FIGMA,
    WorkspaceProvider.CLICKUP,
    WorkspaceProvider.MICROSOFT_SHAREPOINT,
    WorkspaceProvider.MICROSOFT_ONEDRIVE,
  ])('should throw for not-yet-implemented provider %s', (provider) => {
    expect(() => factory.getAdapter(provider)).toThrow(BusinessException);
  });
});
