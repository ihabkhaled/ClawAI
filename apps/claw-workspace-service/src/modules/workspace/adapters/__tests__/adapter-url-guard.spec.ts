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
 * TD-040. Every provider call carries the user's OAuth token or the app's
 * client secret, so it goes through `guardedFetch`: the host must be the
 * provider host the adapter declares, and a redirect is refused.
 *
 * These cases prove the LEGIT destinations still work under a CI-shaped
 * environment — a GitHub runner defines `*_ENDPOINT` variables, which makes
 * the shared guard enforce instead of standing down. The "refused before any
 * network call" half for the fixed-host adapters is
 * `adapter-url-guard-hostile.spec.ts`, which has to replace the constants
 * module and so cannot share this file.
 */

type AdapterCase = {
  name: string;
  build: () => WorkspaceAdapter;
  apiHost: string;
  tokenHost: string;
};

const CASES: AdapterCase[] = [
  {
    name: 'GitHub',
    build: () => new GitHubAdapter(new GitHubWriteActionsHelper()),
    apiHost: 'api.github.com',
    tokenHost: 'github.com',
  },
  {
    name: 'GitLab',
    build: () => new GitLabAdapter(new GitLabWriteActionsHelper()),
    apiHost: 'gitlab.com',
    tokenHost: 'gitlab.com',
  },
  {
    name: 'Bitbucket',
    build: () => new BitbucketAdapter(),
    apiHost: 'api.bitbucket.org',
    tokenHost: 'bitbucket.org',
  },
  {
    name: 'Slack',
    build: () => new SlackAdapter(),
    apiHost: 'slack.com',
    tokenHost: 'slack.com',
  },
  {
    name: 'Jira',
    build: () => new JiraAdapter(),
    apiHost: 'api.atlassian.com',
    tokenHost: 'auth.atlassian.com',
  },
  {
    name: 'Confluence',
    build: () => new ConfluenceAdapter(),
    apiHost: 'api.atlassian.com',
    tokenHost: 'auth.atlassian.com',
  },
  {
    name: 'Figma',
    build: () => new FigmaAdapter(),
    apiHost: 'api.figma.com',
    tokenHost: 'api.figma.com',
  },
  {
    name: 'ClickUp',
    build: () => new ClickUpAdapter(),
    apiHost: 'api.clickup.com',
    tokenHost: 'api.clickup.com',
  },
  {
    name: 'Google Drive',
    build: () => new GoogleDriveAdapter(),
    apiHost: 'www.googleapis.com',
    tokenHost: 'oauth2.googleapis.com',
  },
  {
    name: 'Gmail',
    build: () => new GmailAdapter(),
    apiHost: 'gmail.googleapis.com',
    tokenHost: 'oauth2.googleapis.com',
  },
  {
    name: 'Google Calendar',
    build: () => new GoogleCalendarAdapter(),
    apiHost: 'www.googleapis.com',
    tokenHost: 'oauth2.googleapis.com',
  },
  {
    name: 'OneDrive',
    build: () => new OneDriveAdapter(),
    apiHost: 'graph.microsoft.com',
    tokenHost: 'login.microsoftonline.com',
  },
  {
    name: 'SharePoint',
    build: () => new SharePointAdapter(),
    apiHost: 'graph.microsoft.com',
    tokenHost: 'login.microsoftonline.com',
  },
  {
    name: 'Outlook Calendar',
    build: () => new OutlookCalendarAdapter(),
    apiHost: 'graph.microsoft.com',
    tokenHost: 'login.microsoftonline.com',
  },
];

function enforceLikeCi(): void {
  vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
  resetInternalHostAllowlist();
}

function firstCall(fetchMock: Mock): { host: string; init: RequestInit } {
  const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { host: new URL(target).host, init };
}

describe('workspace provider adapters go through the outbound URL guard', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    enforceLikeCi();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      // `ok` is Slack's in-body success flag; the others ignore it.
      json: () => Promise.resolve({ ok: true, error: 'invalid_grant' }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetInternalHostAllowlist();
  });

  describe.each(CASES)('$name', ({ build, apiHost, tokenHost }) => {
    it('health check still reaches the provider API, and never follows a redirect', async () => {
      const result = await build().healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
      const { host, init } = firstCall(fetchMock);
      expect(host).toBe(apiHost);
      expect(init.redirect).toBe('error');
    });

    it('OAuth app probe still reaches the provider token endpoint, redirects refused', async () => {
      const adapter = build();
      expect(adapter.validateOAuthAppConfig).toBeDefined();
      await adapter.validateOAuthAppConfig?.({ clientId: 'id', clientSecret: 'secret' });
      const { host, init } = firstCall(fetchMock);
      expect(host).toBe(tokenHost);
      expect(init.redirect).toBe('error');
    });

    it('a provider redirect surfaces as a failed call, not a followed one', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed: unexpected redirect'));
      const result = await build().healthCheck('token');
      expect(result.status).not.toBe(WorkspaceConnectorStatus.CONNECTED);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it('Microsoft tenant-specific probe stays on login.microsoftonline.com', async () => {
    await new OneDriveAdapter().validateOAuthAppConfig({
      clientId: 'id',
      clientSecret: 'secret',
      tenantId: 'contoso.onmicrosoft.com',
    });
    const [target] = fetchMock.mock.calls[0] as [string];
    expect(target).toBe(
      'https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/token',
    );
  });

  it('GitHub write actions reach api.github.com with redirects refused', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 1, html_url: 'https://github.com/a/b/issues/1' }),
    });
    const result = await new GitHubWriteActionsHelper().execute('token', 'CREATE_ISSUE', {
      owner: 'a',
      repo: 'b',
      title: 't',
    });
    expect(result.success).toBe(true);
    const { host, init } = firstCall(fetchMock);
    expect(host).toBe('api.github.com');
    expect(init.redirect).toBe('error');
  });

  describe('GitLab — the one provider whose base an admin can configure', () => {
    const adminBase = 'https://gitlab.acme.example';

    it('health check reaches the admin-configured self-hosted base', async () => {
      await new GitLabAdapter(new GitLabWriteActionsHelper()).healthCheck('token', adminBase);
      expect(firstCall(fetchMock).host).toBe('gitlab.acme.example');
    });

    it('token exchange reaches the admin-configured base', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_token: 'a' }),
      });
      await new GitLabAdapter(new GitLabWriteActionsHelper()).exchangeCodeForTokens(
        'code',
        'https://claw.local/cb',
        undefined,
        { clientId: 'id', clientSecret: 'secret', baseUrl: adminBase },
      );
      const { host, init } = firstCall(fetchMock);
      expect(host).toBe('gitlab.acme.example');
      expect(init.redirect).toBe('error');
    });

    // Object metadata is not an admin setting: it cannot move the token.
    it('refuses an apiBaseUrl carried in object metadata, before any request', async () => {
      await expect(
        new GitLabAdapter(new GitLabWriteActionsHelper()).fetchObjectDetails(
          'token',
          '42',
          'REPOSITORY',
          { apiBaseUrl: 'https://attacker.example' },
        ),
      ).rejects.toThrow(/attacker\.example/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
