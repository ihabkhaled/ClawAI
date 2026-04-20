import { BitbucketAdapter } from '../bitbucket.adapter';
import { GitHubAdapter } from '../github.adapter';
import { GitLabAdapter } from '../gitlab.adapter';
import { GoogleDriveAdapter } from '../google-drive.adapter';
import { JiraAdapter } from '../jira.adapter';
import { SlackAdapter } from '../slack.adapter';
import { runAdapterContract } from './adapter-contract';

describe('GitHubAdapter', () => {
  runAdapterContract(() => new GitHubAdapter(), { expectValidatePat: true });
});

describe('GitLabAdapter', () => {
  runAdapterContract(() => new GitLabAdapter(), { expectValidatePat: true });
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

describe('GoogleDriveAdapter', () => {
  runAdapterContract(() => new GoogleDriveAdapter());
});
