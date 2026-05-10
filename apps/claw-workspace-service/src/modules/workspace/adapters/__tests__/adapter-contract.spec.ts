import { BitbucketAdapter } from '../bitbucket.adapter';
import { ClickUpAdapter } from '../clickup.adapter';
import { ConfluenceAdapter } from '../confluence.adapter';
import { FigmaAdapter } from '../figma.adapter';
import { GitHubAdapter } from '../github.adapter';
import { GitHubWriteActionsHelper } from '../github-write-actions.helper';
import { GitLabAdapter } from '../gitlab.adapter';
import { GitLabWriteActionsHelper } from '../gitlab-write-actions.helper';
import { GmailAdapter } from '../gmail.adapter';
import { GoogleDriveAdapter } from '../google-drive.adapter';
import { JiraAdapter } from '../jira.adapter';
import { OneDriveAdapter } from '../onedrive.adapter';
import { SharePointAdapter } from '../sharepoint.adapter';
import { SlackAdapter } from '../slack.adapter';
import { runAdapterContract } from './adapter-contract';

describe('GitHubAdapter', () => {
  runAdapterContract(() => new GitHubAdapter(new GitHubWriteActionsHelper()), {
    expectValidatePat: true,
  });
});

describe('GitLabAdapter', () => {
  runAdapterContract(() => new GitLabAdapter(new GitLabWriteActionsHelper()), {
    expectValidatePat: true,
  });
});

describe('BitbucketAdapter', () => {
  runAdapterContract(() => new BitbucketAdapter());
});

describe('SlackAdapter', () => {
  runAdapterContract(() => new SlackAdapter());
});

describe('JiraAdapter', () => {
  runAdapterContract(() => new JiraAdapter());
});

describe('ConfluenceAdapter', () => {
  runAdapterContract(() => new ConfluenceAdapter());
});

describe('GoogleDriveAdapter', () => {
  runAdapterContract(() => new GoogleDriveAdapter());
});

describe('GmailAdapter', () => {
  runAdapterContract(() => new GmailAdapter());
});

describe('SharePointAdapter', () => {
  runAdapterContract(() => new SharePointAdapter());
});

describe('OneDriveAdapter', () => {
  runAdapterContract(() => new OneDriveAdapter());
});

describe('FigmaAdapter', () => {
  runAdapterContract(() => new FigmaAdapter());
});

describe('ClickUpAdapter', () => {
  runAdapterContract(() => new ClickUpAdapter());
});
