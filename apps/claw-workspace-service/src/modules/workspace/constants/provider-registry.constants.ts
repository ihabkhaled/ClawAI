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
    supportedActions: [WorkspaceActionType.CREATE_ISSUE, WorkspaceActionType.CREATE_ISSUE_COMMENT],
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
    supportedActions: [],
    adapterKey: 'bitbucket',
    capabilities: { sync: true, write: false, webhooks: true, deltaSync: false },
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
    supportedActions: [WorkspaceActionType.SEND_SLACK_MESSAGE],
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
    supportedActions: [WorkspaceActionType.CREATE_TICKET, WorkspaceActionType.ADD_TICKET_COMMENT],
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
    supportedActions: [],
    adapterKey: 'confluence',
    capabilities: { sync: true, write: false, webhooks: false, deltaSync: false },
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
    supportedActions: [],
    adapterKey: 'figma',
    capabilities: { sync: true, write: false, webhooks: true, deltaSync: false },
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
    supportedActions: [WorkspaceActionType.CREATE_TICKET, WorkspaceActionType.ADD_TICKET_COMMENT],
    adapterKey: 'clickup',
    capabilities: { sync: true, write: true, webhooks: true, deltaSync: false },
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
    supportedActions: [],
    adapterKey: 'google-drive',
    capabilities: { sync: true, write: false, webhooks: true, deltaSync: true },
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
    supportedActions: [],
    adapterKey: 'gmail',
    capabilities: { sync: true, write: false, webhooks: false, deltaSync: true },
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
    supportedActions: [],
    adapterKey: 'microsoft-sharepoint',
    capabilities: { sync: true, write: false, webhooks: true, deltaSync: true },
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
    supportedActions: [],
    adapterKey: 'microsoft-onedrive',
    capabilities: { sync: true, write: false, webhooks: true, deltaSync: true },
    iconUrl: '/icons/providers/onedrive.svg',
    docsUrl: 'https://learn.microsoft.com/en-us/onedrive/developer/',
  },
];
