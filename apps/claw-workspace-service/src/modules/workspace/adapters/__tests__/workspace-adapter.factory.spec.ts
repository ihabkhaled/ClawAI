import { WorkspaceAdapterFactory } from '../workspace-adapter.factory';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { BitbucketAdapter } from '../bitbucket.adapter';
import { ClickUpAdapter } from '../clickup.adapter';
import { ConfluenceAdapter } from '../confluence.adapter';
import { FigmaAdapter } from '../figma.adapter';
import { GitHubAdapter } from '../github.adapter';
import { GitLabAdapter } from '../gitlab.adapter';
import { GmailAdapter } from '../gmail.adapter';
import { SlackAdapter } from '../slack.adapter';
import { JiraAdapter } from '../jira.adapter';
import { GoogleCalendarAdapter } from '../google-calendar.adapter';
import { GoogleDriveAdapter } from '../google-drive.adapter';
import { OneDriveAdapter } from '../onedrive.adapter';
import { OutlookCalendarAdapter } from '../outlook-calendar.adapter';
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
  const figma = new FigmaAdapter();
  const clickup = new ClickUpAdapter();
  const googleCalendar = new GoogleCalendarAdapter();
  const outlookCalendar = new OutlookCalendarAdapter();

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
      figma,
      clickup,
      googleCalendar,
      outlookCalendar,
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
    [WorkspaceProvider.FIGMA, figma],
    [WorkspaceProvider.CLICKUP, clickup],
  ])('returns correct adapter for implemented provider %s', (provider, expected) => {
    expect(factory.getAdapter(provider)).toBe(expected);
  });

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
