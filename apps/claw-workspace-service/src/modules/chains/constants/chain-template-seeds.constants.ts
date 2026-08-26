import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import type { ChainDsl } from '../types/chain.types';

/**
 * The placeholder token a template's dslTemplate uses in place of a real
 * connectorId. ChainTemplateService.instantiate() resolves each occurrence
 * to the caller's own connector id for that provider.
 */
export function providerPlaceholder(provider: WorkspaceProvider): string {
  return `$PROVIDER:${provider}`;
}

export type ChainTemplateSeed = {
  key: string;
  name: string;
  description: string;
  category: string;
  requiredProviders: WorkspaceProvider[];
  dslTemplate: ChainDsl;
  version: number;
};

// Phase 07 (scoped slice) — purely mechanical, multi-provider write-action
// sequences. Each is the honest, buildable sub-slice of one of the pack's
// named golden recipes with the AI-classification and automatic-trigger
// layers removed (neither exists in the chain DSL yet — see
// docs/workspace/work-os-current-state-and-gap-map.md Phase 07 section).
export const CHAIN_TEMPLATE_SEEDS: ChainTemplateSeed[] = [
  {
    key: 'ticket-and-notify',
    name: 'File a ticket and announce it',
    description:
      'Creates a Jira ticket, then posts a Slack message linking to it. The mechanical core of the pack\'s "Inbox → Work" recipe, without the AI triage/classification step.',
    category: 'Work Item',
    requiredProviders: [WorkspaceProvider.JIRA, WorkspaceProvider.SLACK],
    version: 1,
    dslTemplate: {
      steps: [
        {
          id: 'create-ticket',
          connectorId: providerPlaceholder(WorkspaceProvider.JIRA),
          actionType: 'CREATE_TICKET',
          payload: {
            projectKey: '',
            summary: '',
            description: '',
            issueType: 'Task',
          },
        },
        {
          id: 'notify',
          connectorId: providerPlaceholder(WorkspaceProvider.SLACK),
          actionType: 'SEND_SLACK_MESSAGE',
          payload: {
            channel: '',
            text: 'New ticket: {{steps.create-ticket.output.url}}',
          },
        },
      ],
    },
  },
  {
    key: 'github-issue-and-notify',
    name: 'File a GitHub issue and announce it',
    description:
      'Creates a GitHub issue, then posts a Slack message linking to it. The mechanical core of the pack\'s "PR → Release" family of recipes, without AI risk classification.',
    category: 'Work Item',
    requiredProviders: [WorkspaceProvider.GITHUB, WorkspaceProvider.SLACK],
    version: 1,
    dslTemplate: {
      steps: [
        {
          id: 'create-issue',
          connectorId: providerPlaceholder(WorkspaceProvider.GITHUB),
          actionType: 'CREATE_ISSUE',
          payload: {
            owner: '',
            repo: '',
            title: '',
            body: '',
            labels: [],
          },
        },
        {
          id: 'notify',
          connectorId: providerPlaceholder(WorkspaceProvider.SLACK),
          actionType: 'SEND_SLACK_MESSAGE',
          payload: {
            channel: '',
            text: 'New issue: {{steps.create-issue.output.url}}',
          },
        },
      ],
    },
  },
  {
    key: 'cross-workspace-kickoff',
    name: 'Cross-workspace task kickoff',
    description:
      'Creates a Jira ticket, then a linked GitHub issue referencing it, then announces both in Slack. The mechanical core of the pack\'s "Ticket → Code → Done" recipe — without the AI implementation-context generation, coding-agent handoff, PR review, or CI steps, none of which the chain DSL supports yet.',
    category: 'Cross-Workspace',
    requiredProviders: [WorkspaceProvider.JIRA, WorkspaceProvider.GITHUB, WorkspaceProvider.SLACK],
    version: 1,
    dslTemplate: {
      steps: [
        {
          id: 'create-ticket',
          connectorId: providerPlaceholder(WorkspaceProvider.JIRA),
          actionType: 'CREATE_TICKET',
          payload: {
            projectKey: '',
            summary: '',
            description: '',
            issueType: 'Task',
          },
        },
        {
          id: 'create-issue',
          connectorId: providerPlaceholder(WorkspaceProvider.GITHUB),
          actionType: 'CREATE_ISSUE',
          payload: {
            owner: '',
            repo: '',
            title: '',
            body: 'Tracks {{steps.create-ticket.output.externalId}}: {{steps.create-ticket.output.url}}',
            labels: [],
          },
        },
        {
          id: 'notify',
          connectorId: providerPlaceholder(WorkspaceProvider.SLACK),
          actionType: 'SEND_SLACK_MESSAGE',
          payload: {
            channel: '',
            text: 'Kickoff: {{steps.create-ticket.output.url}} · {{steps.create-issue.output.url}}',
          },
        },
      ],
    },
  },
];
