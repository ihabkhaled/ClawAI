import { WorkspaceAdapterFactory } from '../workspace-adapter.factory';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { BitbucketAdapter } from '../bitbucket.adapter';
import { ConfluenceAdapter } from '../confluence.adapter';
import { GitHubAdapter } from '../github.adapter';
import { GitLabAdapter } from '../gitlab.adapter';
import { GmailAdapter } from '../gmail.adapter';
import { SlackAdapter } from '../slack.adapter';
import { JiraAdapter } from '../jira.adapter';
import { GoogleDriveAdapter } from '../google-drive.adapter';
import { OneDriveAdapter } from '../onedrive.adapter';
import { SharePointAdapter } from '../sharepoint.adapter';
import { BusinessException } from '../../../../common/errors/business.exception';

describe('WorkspaceAdapterFactory', () => {
  let factory: WorkspaceAdapterFactory;
  const github = new GitHubAdapter();
  const gitlab = new GitLabAdapter();
  const bitbucket = new BitbucketAdapter();
  const slack = new SlackAdapter();
  const jira = new JiraAdapter();
  const confluence = new ConfluenceAdapter();
  const googleDrive = new GoogleDriveAdapter();
  const gmail = new GmailAdapter();
  const sharepoint = new SharePointAdapter();
  const onedrive = new OneDriveAdapter();

  beforeEach(() => {
    factory = new WorkspaceAdapterFactory(
      github,
      gitlab,
      bitbucket,
      slack,
      jira,
      confluence,
      googleDrive,
      gmail,
      sharepoint,
      onedrive,
    );
  });

  it.each([
    [WorkspaceProvider.GITHUB, github],
    [WorkspaceProvider.GITLAB, gitlab],
    [WorkspaceProvider.BITBUCKET, bitbucket],
    [WorkspaceProvider.SLACK, slack],
    [WorkspaceProvider.JIRA, jira],
    [WorkspaceProvider.CONFLUENCE, confluence],
    [WorkspaceProvider.GOOGLE_DRIVE, googleDrive],
    [WorkspaceProvider.GMAIL, gmail],
    [WorkspaceProvider.MICROSOFT_SHAREPOINT, sharepoint],
    [WorkspaceProvider.MICROSOFT_ONEDRIVE, onedrive],
  ])('returns correct adapter for implemented provider %s', (provider, expected) => {
    expect(factory.getAdapter(provider)).toBe(expected);
  });

  it.each([WorkspaceProvider.FIGMA, WorkspaceProvider.CLICKUP])(
    'throws ADAPTER_NOT_IMPLEMENTED for registered-but-unimplemented provider %s',
    (provider) => {
      expect.assertions(2);
      try {
        factory.getAdapter(provider);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).code).toBe('ADAPTER_NOT_IMPLEMENTED');
      }
    },
  );

  it('throws UNSUPPORTED_PROVIDER for entirely unknown provider key', () => {
    expect.assertions(2);
    try {
      factory.getAdapter('UNSUPPORTED' as WorkspaceProvider);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('UNSUPPORTED_PROVIDER');
    }
  });
});
