import { IntegrationTopic } from '@/enums/integration-topic.enum';

/**
 * The single source of truth for what each connector actually does.
 *
 * Copied by hand from
 * `apps/claw-workspace-service/src/modules/workspace/constants/provider-registry.constants.ts`
 * on 2026-08-30, NOT generated at build time — the frontend cannot import a
 * NestJS service module, and there is no public read API for the workspace
 * provider registry (rightly: it also carries OAuth field schemas). This is the
 * same boundary `MODEL_FACTS` crosses the same way, for the same reason.
 *
 * The skill `publish-a-public-marketing-page.md` names the rule this file
 * exists to enforce: connector copy is GENERATED from these facts, never
 * hand-written, because several connectors advertise `webhooks: true` from
 * their own adapter but have no registered signature verifier — the receiver
 * silently rejects every delivery. Claiming "real-time sync" for one of those
 * is false and was caught live on production before this file existed.
 *
 * DRIFT TRIGGER: if `provider-registry.constants.ts` changes — a capability
 * flips, an action is added, deltaSync ships for a connector that lacked it —
 * this file is stale until someone re-copies it. There is no test that can
 * catch that drift automatically (see the ADR-084-style boundary note in
 * `docs/05-frontend/seo-content-architecture.md` §8.6 for why crossing the
 * service boundary at build time was rejected for MODEL_FACTS, and the same
 * reasoning applies here).
 */
export type IntegrationCapabilities = {
  /** Can read data from the connector into ClawAI. */
  sync: boolean;
  /** Can create or update data in the connector from ClawAI. */
  write: boolean;
  /**
   * Can receive real-time push updates from the connector.
   *
   * `false` for a connector whose adapter code requests webhooks but has no
   * registered signature verifier — the delivery would be accepted from
   * anyone, so the receiver rejects it outright. Sync for those connectors is
   * poll-based, not real-time, and no page may say otherwise.
   */
  webhooks: boolean;
  /** Can sync only what changed since the last sync, not a full re-read every time. */
  deltaSync: boolean;
};

export type IntegrationFact = {
  displayName: string;
  /** One-line description of what the connector covers, from the provider registry. */
  description: string;
  capabilities: IntegrationCapabilities;
  /** What ClawAI can read from this connector. */
  readableObjects: readonly string[];
  /** What ClawAI can do back to this connector, in plain language — not the enum member. */
  writeActions: readonly string[];
  /** Vendor's own API documentation, for a reader who wants the primary source. */
  docsUrl: string;
};

export const INTEGRATION_FACTS_REVIEW_DATE = '2026-08-30';

export const INTEGRATION_FACTS: Readonly<Record<IntegrationTopic, IntegrationFact>> = {
  [IntegrationTopic.GITHUB]: {
    displayName: 'GitHub',
    description: 'Repositories, issues, pull requests, and code search',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: true },
    readableObjects: ['Repositories', 'Issues', 'Pull requests', 'Comments'],
    writeActions: [
      'Create an issue',
      'Comment on an issue',
      'Draft a pull request description',
      'Comment on a pull request',
      'Approve a pull request',
      'Suggest a code change',
    ],
    docsUrl: 'https://docs.github.com/en/rest',
  },
  [IntegrationTopic.GITLAB]: {
    displayName: 'GitLab',
    description: 'GitLab projects, merge requests, and issues',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    readableObjects: ['Projects', 'Issues', 'Merge requests', 'Comments'],
    writeActions: [
      'Comment on a merge request',
      'Approve a merge request',
      'Update a merge request description',
      'Suggest a code change',
      'Comment with an inline image',
      'Create an issue',
      'Comment on an issue',
    ],
    docsUrl: 'https://docs.gitlab.com/ee/api/',
  },
  [IntegrationTopic.BITBUCKET]: {
    displayName: 'Bitbucket',
    description: 'Bitbucket Cloud repositories and pull requests',
    // The adapter's webhook signature verifier is a no-op stub that always
    // reports `signatureValid: true` — real-time updates work, but the
    // verification claim would be false, so this page must never say
    // "signature-verified webhooks".
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    readableObjects: ['Repositories', 'Pull requests'],
    writeActions: ['Comment on a pull request', 'Approve a pull request', 'Create an issue'],
    docsUrl: 'https://developer.atlassian.com/cloud/bitbucket/rest/',
  },
  [IntegrationTopic.SLACK]: {
    displayName: 'Slack',
    description: 'Channels, messages, and users in a Slack workspace',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    readableObjects: ['Messages', 'Channels', 'Users'],
    writeActions: ['Send a message', 'Reply in a thread'],
    docsUrl: 'https://api.slack.com/web',
  },
  [IntegrationTopic.JIRA]: {
    displayName: 'Jira',
    description: 'Atlassian Jira issues, projects, and comments',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    readableObjects: ['Issues', 'Tickets', 'Projects', 'Comments'],
    writeActions: [
      'Create a ticket',
      'Create a ticket from a Figma comment',
      'Draft a user story from a Figma file',
      'Update an issue',
      'Comment on a ticket',
    ],
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/',
  },
  [IntegrationTopic.CONFLUENCE]: {
    displayName: 'Confluence',
    description: 'Confluence pages, spaces, and comments',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: false },
    readableObjects: ['Pages', 'Spaces', 'Comments'],
    writeActions: ['Create a page', 'Edit a page'],
    docsUrl: 'https://developer.atlassian.com/cloud/confluence/rest/v2/',
  },
  [IntegrationTopic.FIGMA]: {
    displayName: 'Figma',
    description: 'Figma files, components, and comments',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    readableObjects: ['Files', 'Comments'],
    writeActions: ['Post a comment on a file'],
    docsUrl: 'https://www.figma.com/developers/api',
  },
  [IntegrationTopic.CLICKUP]: {
    displayName: 'ClickUp',
    description: 'ClickUp tasks, spaces, and folders',
    // The adapter's own capability check reports webhooks: true; no signature
    // verifier is registered for ClickUp, so the receiver rejects every
    // delivery. Sync is poll-based. Do not claim real-time updates.
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: false },
    readableObjects: ['Tasks', 'Spaces', 'Folders', 'Comments'],
    writeActions: ['Create a task', 'Update a task', 'Comment on a task'],
    docsUrl: 'https://clickup.com/api',
  },
  [IntegrationTopic.GOOGLE_DRIVE]: {
    displayName: 'Google Drive',
    description: 'Google Drive files, folders, and comments',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: true },
    readableObjects: ['Files', 'Documents', 'Spreadsheets'],
    writeActions: ['Upload a file', 'Move a file'],
    docsUrl: 'https://developers.google.com/drive/api/guides/about-sdk',
  },
  [IntegrationTopic.GMAIL]: {
    displayName: 'Gmail',
    description: 'Gmail threads, messages, and labels',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: true },
    readableObjects: ['Email threads', 'Messages', 'Labels'],
    writeActions: ['Send an email', 'Reply to an email', 'Create a draft'],
    docsUrl: 'https://developers.google.com/gmail/api',
  },
  [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
    displayName: 'Microsoft SharePoint',
    description: 'SharePoint sites, documents, and lists',
    // Adapter capability check reports webhooks: true; no verifier is
    // registered. Sync is poll-based.
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: false },
    readableObjects: ['Documents', 'Files', 'Site lists'],
    writeActions: ['Upload a document', 'Create a list item', 'Update a list item'],
    docsUrl: 'https://learn.microsoft.com/en-us/sharepoint/dev/apis/sharepoint-rest-api',
  },
  [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
    displayName: 'Microsoft OneDrive',
    description: 'OneDrive files and folders',
    // Adapter capability check reports webhooks: true; no verifier is
    // registered. Sync is poll-based.
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: true },
    readableObjects: ['Files', 'Documents'],
    writeActions: ['Upload a file', 'Move a file'],
    docsUrl: 'https://learn.microsoft.com/en-us/onedrive/developer/',
  },
  [IntegrationTopic.GOOGLE_CALENDAR]: {
    displayName: 'Google Calendar',
    description: 'Google Calendar meetings and events',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: true },
    readableObjects: ['Meetings and events'],
    // Exactly one write action exists — do not imply broader calendar
    // management (rescheduling, deleting, responding to invites) than this.
    writeActions: ['Create a calendar event'],
    docsUrl: 'https://developers.google.com/calendar/api/guides/overview',
  },
  [IntegrationTopic.OUTLOOK_CALENDAR]: {
    displayName: 'Outlook Calendar',
    description: 'Microsoft Outlook Calendar meetings and events',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: false },
    readableObjects: ['Meetings and events'],
    writeActions: ['Create a calendar event'],
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/calendar',
  },
};
