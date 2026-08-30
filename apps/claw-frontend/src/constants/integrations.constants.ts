import { IntegrationTopic } from '@/enums/integration-topic.enum';

export const INTEGRATIONS_HUB_PATH = '/integrations';
export const INTEGRATIONS_HUB_SLUG = 'integrations';

/**
 * When the connector capabilities on these pages were last checked against
 * `apps/claw-workspace-service/src/modules/workspace/constants/provider-registry.constants.ts`.
 * Move this only after re-diffing that file — see `integration-facts.constants.ts`.
 */
export const INTEGRATIONS_REVIEW_DATE = '2026-08-30';

/**
 * Render order on the hub, and generation order for the dynamic route.
 * Grouped by category: code hosting, project/knowledge management, design,
 * files and mail, calendars.
 */
export const INTEGRATION_TOPIC_ORDER: ReadonlyArray<IntegrationTopic> = [
  IntegrationTopic.GITHUB,
  IntegrationTopic.GITLAB,
  IntegrationTopic.BITBUCKET,
  IntegrationTopic.SLACK,
  IntegrationTopic.JIRA,
  IntegrationTopic.CONFLUENCE,
  IntegrationTopic.CLICKUP,
  IntegrationTopic.FIGMA,
  IntegrationTopic.GOOGLE_DRIVE,
  IntegrationTopic.GMAIL,
  IntegrationTopic.MICROSOFT_SHAREPOINT,
  IntegrationTopic.MICROSOFT_ONEDRIVE,
  IntegrationTopic.GOOGLE_CALENDAR,
  IntegrationTopic.OUTLOOK_CALENDAR,
];

export function getIntegrationPath(topic: IntegrationTopic): string {
  return `${INTEGRATIONS_HUB_PATH}/${topic}`;
}

export function getIntegrationSlug(topic: IntegrationTopic): string {
  return `${INTEGRATIONS_HUB_SLUG}/${topic}`;
}

/**
 * Related pages per connector, editorial rather than computed — a reader of
 * the GitHub page and a reader of the Gmail page want different next steps.
 */
export const INTEGRATION_RELATED_PATHS: Readonly<Record<IntegrationTopic, ReadonlyArray<string>>> =
  {
    [IntegrationTopic.GITHUB]: ['/coding-agent', '/use-cases', '/features'],
    [IntegrationTopic.GITLAB]: ['/coding-agent', '/use-cases', '/features'],
    [IntegrationTopic.BITBUCKET]: ['/coding-agent', '/use-cases', '/features'],
    [IntegrationTopic.SLACK]: ['/use-cases', '/features', '/pricing'],
    [IntegrationTopic.JIRA]: ['/use-cases', '/features', '/pricing'],
    [IntegrationTopic.CONFLUENCE]: ['/use-cases', '/features', '/security-and-privacy'],
    [IntegrationTopic.CLICKUP]: ['/use-cases', '/features', '/pricing'],
    [IntegrationTopic.FIGMA]: ['/use-cases', '/features', '/integrations/jira'],
    [IntegrationTopic.GOOGLE_DRIVE]: ['/use-cases', '/security-and-privacy', '/features'],
    [IntegrationTopic.GMAIL]: ['/use-cases', '/security-and-privacy', '/features'],
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: ['/use-cases', '/security-and-privacy', '/features'],
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: ['/use-cases', '/security-and-privacy', '/features'],
    [IntegrationTopic.GOOGLE_CALENDAR]: ['/use-cases', '/features', '/pricing'],
    [IntegrationTopic.OUTLOOK_CALENDAR]: ['/use-cases', '/features', '/pricing'],
  };

export function isIntegrationTopic(value: string): value is IntegrationTopic {
  return (Object.values(IntegrationTopic) as string[]).includes(value);
}
