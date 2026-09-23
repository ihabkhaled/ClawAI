import { type Mock, vi } from 'vitest';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';

import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { BitbucketAdapter } from '../bitbucket.adapter';
import { ClickUpAdapter } from '../clickup.adapter';
import { ConfluenceAdapter } from '../confluence.adapter';
import { FigmaAdapter } from '../figma.adapter';
import { GitHubAdapter } from '../github.adapter';
import { GitHubWriteActionsHelper } from '../github-write-actions.helper';
import { GitLabAdapter } from '../gitlab.adapter';
import { GitLabWriteActionsHelper } from '../gitlab-write-actions.helper';
import { GmailAdapter } from '../gmail.adapter';
import { GoogleCalendarAdapter } from '../google-calendar.adapter';
import { GoogleDriveAdapter } from '../google-drive.adapter';
import { JiraAdapter } from '../jira.adapter';
import { OneDriveAdapter } from '../onedrive.adapter';
import { OutlookCalendarAdapter } from '../outlook-calendar.adapter';
import { SharePointAdapter } from '../sharepoint.adapter';
import { SlackAdapter } from '../slack.adapter';
import type { WorkspaceAdapter } from '../workspace-adapter.interface';

/**
 * TD-040, the refusal half. Every provider base URL in workspace.constants is
 * swapped for the cloud metadata address, which the guard refuses whatever the
 * configuration says. If an adapter still reached `fetch`, its call would have
 * bypassed the guard — so "fetch was never called" is the proof that each
 * adapter's request path runs through it, before any network I/O.
 */
vi.mock('../../../../common/constants/workspace.constants', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'string' && value.startsWith('https://')
        ? value.replace(/^https:\/\/[^/]+/u, 'http://169.254.169.254')
        : value,
    ]),
  );
});

const ADAPTERS: ReadonlyArray<[string, () => WorkspaceAdapter]> = [
  ['GitHub', () => new GitHubAdapter(new GitHubWriteActionsHelper())],
  ['GitLab', () => new GitLabAdapter(new GitLabWriteActionsHelper())],
  ['Bitbucket', () => new BitbucketAdapter()],
  ['Slack', () => new SlackAdapter()],
  ['Jira', () => new JiraAdapter()],
  ['Confluence', () => new ConfluenceAdapter()],
  ['Figma', () => new FigmaAdapter()],
  ['ClickUp', () => new ClickUpAdapter()],
  ['Google Drive', () => new GoogleDriveAdapter()],
  ['Gmail', () => new GmailAdapter()],
  ['Google Calendar', () => new GoogleCalendarAdapter()],
  ['OneDrive', () => new OneDriveAdapter()],
  ['SharePoint', () => new SharePointAdapter()],
  ['Outlook Calendar', () => new OutlookCalendarAdapter()],
];

describe('a disallowed provider host is refused before any network call', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
    resetInternalHostAllowlist();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetInternalHostAllowlist();
  });

  it.each(ADAPTERS)('%s health check', async (_name, build) => {
    const result = await build().healthCheck('token');
    expect(result.status).not.toBe(WorkspaceConnectorStatus.CONNECTED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(ADAPTERS)('%s OAuth app probe', async (_name, build) => {
    const result = await build().validateOAuthAppConfig?.({
      clientId: 'id',
      clientSecret: 'secret',
    });
    expect(result?.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // The GitHub helper lets errors propagate; ActionExecutionManager catches
  // them and records a failed action.
  it('GitHub write action', async () => {
    await expect(
      new GitHubWriteActionsHelper().execute('token', 'CREATE_ISSUE', {
        owner: 'a',
        repo: 'b',
        title: 't',
      }),
    ).rejects.toThrow(/cloud metadata/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
