/**
 * The connector pages under `/integrations`.
 *
 * One member per `WorkspaceProvider` with a shipped adapter — verified against
 * `apps/claw-workspace-service/src/modules/workspace/constants/provider-registry.constants.ts`,
 * not guessed. All 14 have real, tested adapters; every page's capability claims
 * (sync, write, webhooks) are generated from that same registry, never
 * hand-typed, so a claim here cannot drift from what the connector actually does.
 */
export enum IntegrationTopic {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  SLACK = 'slack',
  JIRA = 'jira',
  CONFLUENCE = 'confluence',
  FIGMA = 'figma',
  CLICKUP = 'clickup',
  GOOGLE_DRIVE = 'google-drive',
  GMAIL = 'gmail',
  MICROSOFT_SHAREPOINT = 'microsoft-sharepoint',
  MICROSOFT_ONEDRIVE = 'microsoft-onedrive',
  GOOGLE_CALENDAR = 'google-calendar',
  OUTLOOK_CALENDAR = 'outlook-calendar',
}
