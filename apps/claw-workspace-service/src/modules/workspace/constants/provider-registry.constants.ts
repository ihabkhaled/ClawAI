import {
  WorkspaceActionType,
  WorkspaceObjectType,
  WorkspaceProvider,
  WorkspaceProviderAuthMode,
} from '../../../generated/prisma';

export type ProviderFieldType =
  | 'text'
  | 'textarea'
  | 'secret'
  | 'url'
  | 'email'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'multi_select'
  | 'json'
  | 'scope_picker'
  | 'region_picker'
  | 'tenant_selector'
  | 'hidden';

export type ProviderConfigField = {
  key: string;
  label: string;
  type: ProviderFieldType;
  required: boolean;
  secret: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  pattern?: string;
  min?: number;
  max?: number;
  appliesToAuthModes?: WorkspaceProviderAuthMode[];
};

export type ProviderConfigSchema = {
  version: number;
  fields: ProviderConfigField[];
};

export type ProviderDefinitionSeed = {
  provider: WorkspaceProvider;
  displayName: string;
  description: string;
  authModes: WorkspaceProviderAuthMode[];
  defaultAuthMode: WorkspaceProviderAuthMode;
  configSchema: ProviderConfigSchema;
  supportedObjects: WorkspaceObjectType[];
  supportedActions: WorkspaceActionType[];
  adapterKey: string;
  iconUrl?: string;
  docsUrl?: string;
  capabilities: Record<string, boolean>;
};

const OAUTH_APP_FIELDS: ProviderConfigField[] = [
  {
    key: 'clientId',
    label: 'Client ID',
    type: 'text',
    required: true,
    secret: false,
    appliesToAuthModes: [WorkspaceProviderAuthMode.OAUTH2],
  },
  {
    key: 'clientSecret',
    label: 'Client Secret',
    type: 'secret',
    required: true,
    secret: true,
    appliesToAuthModes: [WorkspaceProviderAuthMode.OAUTH2],
  },
  {
    key: 'redirectUri',
    label: 'Redirect URI',
    type: 'url',
    required: true,
    secret: false,
    appliesToAuthModes: [WorkspaceProviderAuthMode.OAUTH2],
  },
];

const PAT_FIELD: ProviderConfigField = {
  key: 'personalAccessToken',
  label: 'Personal Access Token',
  type: 'secret',
  required: true,
  secret: true,
  appliesToAuthModes: [WorkspaceProviderAuthMode.PAT],
};

export const PROVIDER_DEFINITION_SEEDS: ProviderDefinitionSeed[] = [
  {
    provider: WorkspaceProvider.GITHUB,
    displayName: 'GitHub',
    description: 'Repositories, issues, pull requests, and code search',
    authModes: [WorkspaceProviderAuthMode.OAUTH2, WorkspaceProviderAuthMode.PAT],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        PAT_FIELD,
        {
          key: 'apiBaseUrl',
          label: 'GitHub Enterprise URL',
          type: 'url',
          required: false,
          secret: false,
          placeholder: 'https://github.example.com/api/v3',
        },
      ],
    },
    supportedObjects: [
      WorkspaceObjectType.REPOSITORY,
      WorkspaceObjectType.ISSUE,
      WorkspaceObjectType.PULL_REQUEST,
      WorkspaceObjectType.COMMENT,
    ],
    supportedActions: [
      WorkspaceActionType.CREATE_ISSUE,
      WorkspaceActionType.CREATE_ISSUE_COMMENT,
      WorkspaceActionType.CREATE_PR_DESCRIPTION,
      WorkspaceActionType.COMMENT_PR,
      WorkspaceActionType.APPROVE_PR,
      WorkspaceActionType.ADD_PR_SUGGESTION,
    ],
    adapterKey: 'github',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: true },
    iconUrl: '/icons/providers/github.svg',
    docsUrl: 'https://docs.github.com/en/rest',
  },
  {
    provider: WorkspaceProvider.GITLAB,
    displayName: 'GitLab',
    description: 'GitLab projects, merge requests, and issues',
    authModes: [WorkspaceProviderAuthMode.OAUTH2, WorkspaceProviderAuthMode.PAT],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        PAT_FIELD,
        {
          key: 'apiBaseUrl',
          label: 'GitLab instance URL',
          type: 'url',
          required: false,
          secret: false,
          placeholder: 'https://gitlab.com',
        },
      ],
    },
    supportedObjects: [
      WorkspaceObjectType.REPOSITORY,
      WorkspaceObjectType.ISSUE,
      WorkspaceObjectType.PULL_REQUEST,
      WorkspaceObjectType.COMMENT,
    ],
    supportedActions: [
      WorkspaceActionType.CREATE_MR_COMMENT,
      WorkspaceActionType.APPROVE_MR,
      WorkspaceActionType.CREATE_GITLAB_ISSUE,
      WorkspaceActionType.COMMENT_GITLAB_ISSUE,
      WorkspaceActionType.UPDATE_MR_DESCRIPTION,
      WorkspaceActionType.ADD_MR_SUGGESTION,
      WorkspaceActionType.ADD_MR_IMAGE_COMMENT,
    ],
    adapterKey: 'gitlab',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    iconUrl: '/icons/providers/gitlab.svg',
    docsUrl: 'https://docs.gitlab.com/ee/api/',
  },
  {
    provider: WorkspaceProvider.BITBUCKET,
    displayName: 'Bitbucket',
    description: 'Bitbucket Cloud repositories and pull requests',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [...OAUTH_APP_FIELDS],
    },
    supportedObjects: [WorkspaceObjectType.REPOSITORY, WorkspaceObjectType.PULL_REQUEST],
    supportedActions: [
      WorkspaceActionType.CREATE_PR_COMMENT_BB,
      WorkspaceActionType.APPROVE_PR_BB,
      WorkspaceActionType.CREATE_BITBUCKET_ISSUE,
    ],
    adapterKey: 'bitbucket',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    iconUrl: '/icons/providers/bitbucket.svg',
    docsUrl: 'https://developer.atlassian.com/cloud/bitbucket/rest/',
  },
  {
    provider: WorkspaceProvider.SLACK,
    displayName: 'Slack',
    description: 'Channels, messages, and users in a Slack workspace',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        {
          key: 'signingSecret',
          label: 'Signing Secret (for event webhooks)',
          type: 'secret',
          required: false,
          secret: true,
        },
      ],
    },
    supportedObjects: [
      WorkspaceObjectType.MESSAGE,
      WorkspaceObjectType.CHANNEL,
      WorkspaceObjectType.USER,
    ],
    supportedActions: [
      WorkspaceActionType.SEND_SLACK,
      WorkspaceActionType.SEND_SLACK_MESSAGE,
      WorkspaceActionType.REPLY_SLACK,
    ],
    adapterKey: 'slack',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    iconUrl: '/icons/providers/slack.svg',
    docsUrl: 'https://api.slack.com/web',
  },
  {
    provider: WorkspaceProvider.JIRA,
    displayName: 'Jira',
    description: 'Atlassian Jira issues, projects, and comments',
    authModes: [WorkspaceProviderAuthMode.OAUTH2, WorkspaceProviderAuthMode.BASIC],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        {
          key: 'siteUrl',
          label: 'Jira Site URL',
          type: 'url',
          required: true,
          secret: false,
          placeholder: 'https://your-org.atlassian.net',
        },
        {
          key: 'email',
          label: 'Email (for basic auth)',
          type: 'email',
          required: false,
          secret: false,
          appliesToAuthModes: [WorkspaceProviderAuthMode.BASIC],
        },
        {
          key: 'apiToken',
          label: 'API Token',
          type: 'secret',
          required: false,
          secret: true,
          appliesToAuthModes: [WorkspaceProviderAuthMode.BASIC],
        },
      ],
    },
    supportedObjects: [
      WorkspaceObjectType.ISSUE,
      WorkspaceObjectType.TICKET,
      WorkspaceObjectType.PROJECT,
      WorkspaceObjectType.COMMENT,
    ],
    supportedActions: [
      WorkspaceActionType.CREATE_TICKET,
      WorkspaceActionType.CREATE_JIRA_FROM_FIGMA,
      WorkspaceActionType.CREATE_USER_STORY_FROM_FIGMA,
      WorkspaceActionType.UPDATE_JIRA_ISSUE,
      WorkspaceActionType.ADD_TICKET_COMMENT,
      WorkspaceActionType.COMMENT_JIRA,
    ],
    adapterKey: 'jira',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    iconUrl: '/icons/providers/jira.svg',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/',
  },
  {
    provider: WorkspaceProvider.CONFLUENCE,
    displayName: 'Confluence',
    description: 'Confluence pages, spaces, and comments',
    authModes: [WorkspaceProviderAuthMode.OAUTH2, WorkspaceProviderAuthMode.BASIC],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        {
          key: 'siteUrl',
          label: 'Confluence Site URL',
          type: 'url',
          required: true,
          secret: false,
          placeholder: 'https://your-org.atlassian.net/wiki',
        },
      ],
    },
    supportedObjects: [
      WorkspaceObjectType.DOCUMENT,
      WorkspaceObjectType.COMMENT,
      WorkspaceObjectType.PROJECT,
    ],
    supportedActions: [WorkspaceActionType.CREATE_CONFLUENCE, WorkspaceActionType.EDIT_CONFLUENCE],
    adapterKey: 'confluence',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: false },
    iconUrl: '/icons/providers/confluence.svg',
    docsUrl: 'https://developer.atlassian.com/cloud/confluence/rest/v2/',
  },
  {
    provider: WorkspaceProvider.FIGMA,
    displayName: 'Figma',
    description: 'Figma files, components, and comments',
    authModes: [WorkspaceProviderAuthMode.OAUTH2, WorkspaceProviderAuthMode.PAT],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [...OAUTH_APP_FIELDS, PAT_FIELD],
    },
    supportedObjects: [WorkspaceObjectType.DOCUMENT, WorkspaceObjectType.COMMENT],
    supportedActions: [WorkspaceActionType.POST_FIGMA_COMMENT],
    adapterKey: 'figma',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
    iconUrl: '/icons/providers/figma.svg',
    docsUrl: 'https://www.figma.com/developers/api',
  },
  {
    provider: WorkspaceProvider.CLICKUP,
    displayName: 'ClickUp',
    description: 'ClickUp tasks, spaces, and folders',
    authModes: [WorkspaceProviderAuthMode.OAUTH2, WorkspaceProviderAuthMode.PAT],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [...OAUTH_APP_FIELDS, PAT_FIELD],
    },
    supportedObjects: [
      WorkspaceObjectType.TICKET,
      WorkspaceObjectType.PROJECT,
      WorkspaceObjectType.COMMENT,
    ],
    supportedActions: [
      WorkspaceActionType.CREATE_CLICKUP_TASK,
      WorkspaceActionType.UPDATE_CLICKUP_TASK,
      WorkspaceActionType.COMMENT_CLICKUP_TASK,
    ],
    adapterKey: 'clickup',
    // The adapter's own getCapabilities() advertised webhooks: true, but no
    // signature verifier is registered for CLICKUP in
    // webhook-signature-verifiers.utility.ts, so the receiver rejects every
    // delivery (see docs/workspace/work-os-current-state-and-gap-map.md).
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: false },
    iconUrl: '/icons/providers/clickup.svg',
    docsUrl: 'https://clickup.com/api',
  },
  {
    provider: WorkspaceProvider.GOOGLE_DRIVE,
    displayName: 'Google Drive',
    description: 'Google Drive files, folders, and comments',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [...OAUTH_APP_FIELDS],
    },
    supportedObjects: [
      WorkspaceObjectType.FILE,
      WorkspaceObjectType.DOCUMENT,
      WorkspaceObjectType.SPREADSHEET,
    ],
    supportedActions: [WorkspaceActionType.UPLOAD_DRIVE, WorkspaceActionType.MOVE_DRIVE],
    adapterKey: 'google-drive',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: true },
    iconUrl: '/icons/providers/google-drive.svg',
    docsUrl: 'https://developers.google.com/drive/api/guides/about-sdk',
  },
  {
    provider: WorkspaceProvider.GMAIL,
    displayName: 'Gmail',
    description: 'Gmail threads, messages, and labels',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [...OAUTH_APP_FIELDS],
    },
    supportedObjects: [WorkspaceObjectType.EMAIL],
    supportedActions: [
      WorkspaceActionType.SEND_EMAIL,
      WorkspaceActionType.REPLY_EMAIL,
      WorkspaceActionType.CREATE_DRAFT,
    ],
    adapterKey: 'gmail',
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: true },
    iconUrl: '/icons/providers/gmail.svg',
    docsUrl: 'https://developers.google.com/gmail/api',
  },
  {
    provider: WorkspaceProvider.MICROSOFT_SHAREPOINT,
    displayName: 'Microsoft SharePoint',
    description: 'SharePoint sites, documents, and lists',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        {
          key: 'tenantId',
          label: 'Microsoft Tenant ID',
          type: 'text',
          required: true,
          secret: false,
        },
      ],
    },
    supportedObjects: [
      WorkspaceObjectType.DOCUMENT,
      WorkspaceObjectType.FILE,
      WorkspaceObjectType.PROJECT,
    ],
    supportedActions: [
      WorkspaceActionType.UPLOAD_SHAREPOINT,
      WorkspaceActionType.CREATE_SHAREPOINT_LIST_ITEM,
      WorkspaceActionType.UPDATE_SHAREPOINT_LIST_ITEM,
    ],
    adapterKey: 'microsoft-sharepoint',
    // The adapter's own getCapabilities() advertised webhooks: true, but no
    // signature verifier is registered for MICROSOFT_SHAREPOINT in
    // webhook-signature-verifiers.utility.ts, so the receiver rejects every
    // delivery (see docs/workspace/work-os-current-state-and-gap-map.md).
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: false },
    iconUrl: '/icons/providers/sharepoint.svg',
    docsUrl: 'https://learn.microsoft.com/en-us/sharepoint/dev/apis/sharepoint-rest-api',
  },
  {
    provider: WorkspaceProvider.MICROSOFT_ONEDRIVE,
    displayName: 'Microsoft OneDrive',
    description: 'OneDrive files and folders',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        {
          key: 'tenantId',
          label: 'Microsoft Tenant ID',
          type: 'text',
          required: true,
          secret: false,
        },
      ],
    },
    supportedObjects: [WorkspaceObjectType.FILE, WorkspaceObjectType.DOCUMENT],
    supportedActions: [WorkspaceActionType.UPLOAD_ONEDRIVE, WorkspaceActionType.MOVE_ONEDRIVE],
    adapterKey: 'microsoft-onedrive',
    // The adapter's own getCapabilities() advertised webhooks: true, but no
    // signature verifier is registered for MICROSOFT_ONEDRIVE in
    // webhook-signature-verifiers.utility.ts, so the receiver rejects every
    // delivery (see docs/workspace/work-os-current-state-and-gap-map.md).
    capabilities: { sync: true, write: true, webhooks: false, deltaSync: true },
    iconUrl: '/icons/providers/onedrive.svg',
    docsUrl: 'https://learn.microsoft.com/en-us/onedrive/developer/',
  },
  // Stream 23 — Calendar providers were added to WorkspaceProvider and given
  // working, tested adapters, but were never added to this registry, so
  // ProviderRegistryService.getByProvider(GOOGLE_CALENDAR |
  // OUTLOOK_CALENDAR) threw EntityNotFoundException for a provider that
  // otherwise works end to end. Both adapters are read-only (no
  // supportsWrite/executeWriteAction), so supportedActions is empty.
  {
    provider: WorkspaceProvider.GOOGLE_CALENDAR,
    displayName: 'Google Calendar',
    description: 'Google Calendar meetings and events (read-only)',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [...OAUTH_APP_FIELDS],
    },
    supportedObjects: [WorkspaceObjectType.MEETING],
    supportedActions: [],
    adapterKey: 'google-calendar',
    capabilities: { sync: true, write: false, webhooks: false, deltaSync: true },
    iconUrl: '/icons/providers/google-calendar.svg',
    docsUrl: 'https://developers.google.com/calendar/api/guides/overview',
  },
  {
    provider: WorkspaceProvider.OUTLOOK_CALENDAR,
    displayName: 'Outlook Calendar',
    description: 'Microsoft Outlook Calendar meetings and events (read-only)',
    authModes: [WorkspaceProviderAuthMode.OAUTH2],
    defaultAuthMode: WorkspaceProviderAuthMode.OAUTH2,
    configSchema: {
      version: 1,
      fields: [
        ...OAUTH_APP_FIELDS,
        {
          key: 'tenantId',
          label: 'Microsoft Tenant ID',
          type: 'text',
          required: false,
          secret: false,
          helpText: 'Leave blank to use the multi-tenant /common/ endpoint.',
        },
      ],
    },
    supportedObjects: [WorkspaceObjectType.MEETING],
    supportedActions: [],
    adapterKey: 'outlook-calendar',
    capabilities: { sync: true, write: false, webhooks: false, deltaSync: false },
    iconUrl: '/icons/providers/outlook-calendar.svg',
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/calendar',
  },
];
