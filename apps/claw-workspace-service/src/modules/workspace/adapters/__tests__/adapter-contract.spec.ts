import { GitHubAdapter } from '../github.adapter';
import { GoogleDriveAdapter } from '../google-drive.adapter';
import { JiraAdapter } from '../jira.adapter';
import { SlackAdapter } from '../slack.adapter';
import { runAdapterContract } from './adapter-contract';

describe('GitHubAdapter', () => {
  runAdapterContract(() => new GitHubAdapter(), { expectValidatePat: true });
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
