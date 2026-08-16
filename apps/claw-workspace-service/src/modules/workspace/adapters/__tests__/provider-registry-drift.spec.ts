import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { isWebhookSupported } from '../../../webhooks/utilities/webhook-signature-verifiers.utility';
import { PROVIDER_DEFINITION_SEEDS } from '../../constants/provider-registry.constants';
import { WorkspaceAdapterFactory } from '../workspace-adapter.factory';
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

// This is the Phase 02 contract test the ClawAI_Workspace_Automation_Prompt_Pack asks for:
// "Add contract tests that fail when adapter implements an action not in manifest, [or]
// manifest advertises an action with no implementation." It exists because Phase 01's manual
// audit found PROVIDER_DEFINITION_SEEDS badly drifted from every adapter's real behavior
// (wrong action lists, wrong write/webhook flags, two whole providers missing) — see
// docs/workspace/work-os-current-state-and-gap-map.md. This test makes that class of bug fail
// CI instead of silently shipping.
describe('PROVIDER_DEFINITION_SEEDS vs. real adapter behavior (registry drift contract)', () => {
  const github = new GitHubAdapter(new GitHubWriteActionsHelper());
  const gitlab = new GitLabAdapter(new GitLabWriteActionsHelper());
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

  const factory = new WorkspaceAdapterFactory(
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

  it('registers every WorkspaceProvider enum value exactly once', () => {
    const seededProviders = PROVIDER_DEFINITION_SEEDS.map((s) => s.provider);
    expect(new Set(seededProviders).size).toBe(seededProviders.length); // no duplicates
    expect(new Set(seededProviders)).toEqual(new Set(Object.values(WorkspaceProvider)));
  });

  it.each(PROVIDER_DEFINITION_SEEDS)(
    '$provider: registry.supportedActions matches adapter.getSupportedActionTypes()',
    (seed) => {
      const adapter = factory.getAdapter(seed.provider);
      const declared = new Set(adapter.getSupportedActionTypes?.() ?? []);
      expect(new Set(seed.supportedActions)).toEqual(declared);
    },
  );

  it.each(PROVIDER_DEFINITION_SEEDS)(
    '$provider: registry.capabilities.write matches adapter.supportsWrite()',
    (seed) => {
      const adapter = factory.getAdapter(seed.provider);
      expect(seed.capabilities['write']).toBe(Boolean(adapter.supportsWrite?.()));
    },
  );

  it.each(PROVIDER_DEFINITION_SEEDS)(
    '$provider: registry.capabilities.webhooks matches the receiver truth (isWebhookSupported)',
    (seed) => {
      // Prisma's generated WorkspaceProvider enum and the hand-written
      // common/enums mirror are structurally identical string enums but
      // nominally distinct types; bridging them with a plain cast matches
      // the existing convention in workspace-provider-registry.controller.ts.
      expect(seed.capabilities['webhooks']).toBe(
        isWebhookSupported(seed.provider as WorkspaceProvider),
      );
    },
  );
});
