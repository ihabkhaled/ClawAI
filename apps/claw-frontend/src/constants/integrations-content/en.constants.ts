import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const EN_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All integrations',
    ctaTitle: 'Connect it and see for yourself',
    ctaBody:
      'Every connector is available on every paid plan. Connect it from your workspace settings.',
    startFree: 'Start on the free plan',
    seeFeatures: 'See what ClawAI does',
    capabilitiesHeading: 'What this connector can do',
    readLabel: 'ClawAI can read',
    writeLabel: 'ClawAI can write',
    syncLabel: 'Sync',
    realTimeLabel: 'Updates in real time',
    pollBasedLabel: 'Syncs on a schedule, not in real time',
  },
  hub: {
    seo: {
      title: 'Integrations: connect ClawAI to your tools',
      description:
        'ClawAI connects to 14 workspace tools — GitHub, Slack, Jira, Google Drive, Gmail, and more — so a conversation can read your work and act on it, not just talk about it.',
      keywords: ['ClawAI integrations', 'AI workspace connectors', 'AI tool integrations'],
    },
    eyebrow: 'Integrations',
    title: 'Connect ClawAI to the tools you already use',
    summary:
      'Each connector below is real and shipped, not a roadmap item — what it can read, what it can write, and whether it updates in real time or on a schedule, all pulled from the same registry the product itself runs on.',
    topicsHeading: 'Pick a connector',
    cardSummaries: {
      [IntegrationTopic.GITHUB]:
        'Repositories, issues, pull requests — read, comment, review, approve.',
      [IntegrationTopic.GITLAB]:
        'Projects, merge requests, issues — comment, approve, suggest changes.',
      [IntegrationTopic.BITBUCKET]:
        'Repositories and pull requests — comment, approve, file issues.',
      [IntegrationTopic.SLACK]: 'Channels and messages — read context, send and reply to messages.',
      [IntegrationTopic.JIRA]: 'Issues and projects — create tickets, update them, comment.',
      [IntegrationTopic.CONFLUENCE]:
        'Pages and spaces — read documentation, create and edit pages.',
      [IntegrationTopic.CLICKUP]: 'Tasks, spaces, folders — create, update, and comment on tasks.',
      [IntegrationTopic.FIGMA]:
        'Files and comments — read designs, post comments, hand off to Jira.',
      [IntegrationTopic.GOOGLE_DRIVE]:
        'Files and folders — read documents and spreadsheets, upload and move files.',
      [IntegrationTopic.GMAIL]: 'Threads and messages — read email, send, reply, and draft.',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]:
        'Sites, documents, lists — read and upload documents, manage list items.',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]: 'Files and folders — read, upload, and move files.',
      [IntegrationTopic.GOOGLE_CALENDAR]:
        'Meetings and events — read your calendar, create events.',
      [IntegrationTopic.OUTLOOK_CALENDAR]:
        'Meetings and events — read your calendar, create events.',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'AI GitHub integration — ClawAI',
        description:
          'Connect GitHub to ClawAI to read repositories, issues, and pull requests, and to draft PR descriptions, comment, suggest changes, and approve — from a conversation.',
        keywords: ['AI GitHub integration', 'AI code review GitHub', 'chat with GitHub repository'],
      },
      eyebrow: 'Code hosting',
      title: 'GitHub',
      summary:
        'Connect a GitHub account or organization so ClawAI can read your repositories, issues, and pull requests, and act on them — drafting descriptions, leaving comments, suggesting changes, and approving reviews — from inside a conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'Once connected, ClawAI can read repository contents, issues, pull requests, and comments. Real-time updates are supported — a webhook tells ClawAI when something changes rather than waiting for a poll — and delta sync means re-reading a large repository does not mean re-reading it from scratch every time.',
            'On the write side, ClawAI can create an issue, comment on an issue, draft a pull request description, comment on a pull request, suggest a specific code change, and approve a pull request. Every write happens as an explicit action you review, not silently in the background.',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: 'How this fits the Coding Agent',
          paragraphs: [
            "The GitHub connector and the Coding Agent solve related but different problems. The Coding Agent works inside your editor on a checked-out repository. The GitHub connector works inside a ClawAI conversation on GitHub's hosted data — issues, pull requests, and review comments — without anyone having the repository open locally.",
            'A common pattern: use the connector to triage issues and draft PR descriptions from chat, and reach for the Coding Agent when the work is actually writing and running code.',
          ],
        },
        {
          id: 'authentication',
          heading: 'How you connect it',
          paragraphs: [
            "GitHub supports OAuth (the default — sign in with GitHub, grant scoped access) or a personal access token, for accounts and automations that prefer a token. GitHub Enterprise is supported by pointing the connector at your instance's API URL instead of github.com.",
          ],
        },
      ],
      faq: [
        {
          question: 'Can ClawAI comment on my pull requests automatically?',
          answer:
            'It can leave a comment when you ask it to — reviewing a diff and posting feedback, or approving once it is satisfied. It does not comment unprompted; every write is an action you request.',
        },
        {
          question: 'Does it work with private repositories?',
          answer:
            'Yes, subject to the access you grant during connection. ClawAI only sees what the connected account or token can see.',
        },
        {
          question: 'Does this replace the Coding Agent?',
          answer:
            "No — they cover different surfaces. The connector reaches GitHub's hosted issues and pull requests from chat; the Coding Agent works on your checked-out code in your editor.",
        },
      ],
      productNote:
        'The GitHub connector is one of {connectorCount} workspace connectors in ClawAI, and every write action it performs is one you asked for.',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'AI GitLab integration — ClawAI',
        description:
          'Connect GitLab to ClawAI to read projects, merge requests, and issues, and to comment, suggest changes, update descriptions, and approve — from a conversation.',
        keywords: ['AI GitLab integration', 'AI merge request review', 'GitLab AI assistant'],
      },
      eyebrow: 'Code hosting',
      title: 'GitLab',
      summary:
        'Connect a GitLab account or self-managed instance so ClawAI can read your projects, merge requests, and issues, and act on them from a conversation — commenting, suggesting changes, updating descriptions, and approving.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read projects, issues, merge requests, and comments, with real-time updates via webhook. Sync is a full re-read on each run rather than delta sync, which matters for very large projects more than small ones.',
            'On the write side: comment on a merge request, approve it, update its description, suggest a specific code change, add an inline comment on an image, create an issue, and comment on an issue. Each is an explicit action you request.',
          ],
        },
        {
          id: 'self-managed',
          heading: 'Self-managed GitLab',
          paragraphs: [
            'The connector is not limited to gitlab.com — pointing it at your own instance URL during setup connects ClawAI to a self-managed GitLab the same way it connects to the hosted service.',
          ],
        },
        {
          id: 'authentication',
          heading: 'How you connect it',
          paragraphs: [
            'GitLab supports OAuth or a personal access token. Both are scoped to what you grant during connection — ClawAI never has broader access than the token or OAuth grant allows.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does it work with self-managed GitLab?',
          answer:
            'Yes — set the instance URL when connecting, and ClawAI talks to your own GitLab install rather than gitlab.com.',
        },
        {
          question: 'Can it suggest actual code changes, not just comments?',
          answer:
            'Yes, through the suggested-change action, which posts a specific, applicable diff suggestion on the merge request rather than a plain-text comment.',
        },
        {
          question: 'Does merge request sync happen in real time?',
          answer:
            'Yes — the connector supports webhooks, so ClawAI is notified of changes rather than polling for them.',
        },
      ],
      productNote:
        'GitLab is one of {connectorCount} workspace connectors in ClawAI, each with its own read and write capabilities documented on its own page.',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'AI Bitbucket integration — ClawAI',
        description:
          'Connect Bitbucket Cloud to ClawAI to read repositories and pull requests, and to comment, approve, and file issues — from a conversation.',
        keywords: [
          'AI Bitbucket integration',
          'Bitbucket AI assistant',
          'AI code repository search',
        ],
      },
      eyebrow: 'Code hosting',
      title: 'Bitbucket',
      summary:
        'Connect a Bitbucket Cloud account so ClawAI can read your repositories and pull requests, and act on them — commenting, approving, and filing issues — from a conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read repositories and pull requests, with support for real-time webhook updates. Sync is a full re-read on each run rather than incremental delta sync.',
            'On the write side: comment on a pull request, approve a pull request, and create an issue. Each is an explicit action, not something ClawAI does on its own.',
          ],
        },
        {
          id: 'authentication',
          heading: 'How you connect it',
          paragraphs: [
            'Bitbucket connects through OAuth — sign in with your Atlassian account and grant scoped access to the workspaces and repositories you choose.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is Bitbucket Server or Data Center supported?',
          answer:
            'The connector targets Bitbucket Cloud. Self-hosted Bitbucket Server or Data Center is not currently supported.',
        },
        {
          question: 'Can it approve a pull request for me?',
          answer:
            'It can, when you ask it to after reviewing the diff — approval is an explicit action you request, not an automatic step.',
        },
      ],
      productNote: 'Bitbucket is one of {connectorCount} workspace connectors in ClawAI.',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'AI Slack integration — ClawAI',
        description:
          'Connect Slack to ClawAI to search channels and messages, and to send and reply to messages — so a conversation can act on what your team is discussing.',
        keywords: ['AI Slack assistant', 'AI search Slack messages', 'Slack AI integration'],
      },
      eyebrow: 'Communication',
      title: 'Slack',
      summary:
        'Connect a Slack workspace so ClawAI can read channels, messages, and users, and send or reply to messages on your behalf — turning a search across scattered threads into a question you ask once.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            "ClawAI can read messages, channels, and users, with real-time updates via Slack's event webhooks — new messages are visible as they arrive rather than on the next poll.",
            'On the write side: send a message to a channel, and reply within a thread. Both require your explicit request; ClawAI never posts to Slack unprompted.',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: 'What it is good for',
          paragraphs: [
            "Finding a decision buried in a thread from three weeks ago, summarizing a channel's discussion before a meeting, or drafting a reply that references context from several messages — the kind of search that a Slack search box does not handle well because it matches keywords, not meaning.",
          ],
        },
      ],
      faq: [
        {
          question: 'Can ClawAI read private channels?',
          answer:
            'Only channels the connected account is a member of and grants access to during connection — ClawAI never sees more of a workspace than the connecting user can.',
        },
        {
          question: 'Will it post to Slack without me asking?',
          answer:
            'No. Sending or replying to a message is always an explicit action you request in the conversation.',
        },
      ],
      productNote:
        'Slack is one of {connectorCount} workspace connectors in ClawAI, with real-time updates via webhook.',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'AI Jira integration — ClawAI',
        description:
          'Connect Jira to ClawAI to read issues and projects, and to create tickets, update them, and comment — including turning a Figma comment into a ticket directly.',
        keywords: ['AI Jira assistant', 'AI for Jira tickets', 'Jira AI integration'],
      },
      eyebrow: 'Project management',
      title: 'Jira',
      summary:
        'Connect an Atlassian Jira site so ClawAI can read issues, tickets, projects, and comments, and act on them — creating and updating tickets, commenting, and turning a Figma design comment directly into a Jira ticket or user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read issues, tickets, projects, and comments, with real-time updates via webhook.',
            'On the write side: create a ticket, create a ticket directly from a Figma comment, draft a user story from a Figma file, update an issue, and comment on a ticket. The Figma-to-Jira actions are the most distinctive — they close the loop between a design review and a tracked piece of work without retyping anything.',
          ],
        },
        {
          id: 'authentication',
          heading: 'How you connect it',
          paragraphs: [
            'Jira supports OAuth or basic authentication with an API token, alongside your Jira site URL. Basic auth suits service accounts and automations that should not go through an interactive OAuth flow.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can it create a Jira ticket from a Figma comment automatically?',
          answer:
            'It can, when you ask it to — the action reads the Figma comment and creates a corresponding Jira ticket or draft user story in one step, rather than you copying details between the two tools by hand.',
        },
        {
          question: 'Does it work with Jira Server, or only Jira Cloud?',
          answer:
            "The connector targets Atlassian's cloud Jira REST API. A self-hosted Jira Server instance is not currently supported.",
        },
      ],
      productNote:
        'Jira is one of {connectorCount} workspace connectors in ClawAI, and pairs directly with the Figma connector for design-to-ticket handoff.',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'AI Confluence integration — ClawAI',
        description:
          'Connect Confluence to ClawAI to read pages, spaces, and comments, and to create and edit pages — so documentation stays a conversation away.',
        keywords: [
          'AI Confluence assistant',
          'Confluence AI integration',
          'AI documentation search',
        ],
      },
      eyebrow: 'Documentation',
      title: 'Confluence',
      summary:
        'Connect an Atlassian Confluence site so ClawAI can read pages, spaces, and comments, and create or edit pages directly — turning a documentation search into a question and a documentation update into a request.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read pages, comments, and the projects (spaces) that organize them. This connector does not support real-time webhook updates — sync happens on request rather than by push notification, so a page edited moments ago may not be reflected until the next sync.',
            'On the write side: create a page, and edit an existing page. Both are explicit actions.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does Confluence sync happen in real time?',
          answer:
            'No — unlike GitHub or Slack, Confluence does not push updates to ClawAI. Content is synced when requested rather than the moment it changes.',
        },
        {
          question: 'Can it write documentation for me, not just read it?',
          answer:
            'Yes — creating and editing pages are both supported write actions, each one an explicit request you make.',
        },
      ],
      productNote: 'Confluence is one of {connectorCount} workspace connectors in ClawAI.',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'AI Figma integration — ClawAI',
        description:
          'Connect Figma to ClawAI to read files and comments, post comments, and hand a design comment off directly to Jira as a ticket or user story.',
        keywords: ['AI Figma assistant', 'Figma AI integration', 'Figma to Jira automation'],
      },
      eyebrow: 'Design',
      title: 'Figma',
      summary:
        'Connect a Figma account so ClawAI can read files and comments, post a comment of its own, and — paired with the Jira connector — turn a design comment directly into a tracked ticket or draft user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read Figma files and their comments, with real-time updates via webhook. On the write side, it can post a comment on a file.',
            "Figma's main leverage in ClawAI comes from pairing it with Jira: a comment on a design can become a Jira ticket or a drafted user story without anyone retyping the context by hand — see the Jira integration page for the specific actions.",
          ],
        },
      ],
      faq: [
        {
          question: 'Can ClawAI read the actual design, not just comments?',
          answer:
            'It can read file content and comments through the Figma API. What it can meaningfully summarize about visual design depends on the file — comments and structure are the most reliable source.',
        },
        {
          question: 'Do I need the Jira connector too, for the Figma-to-ticket workflow?',
          answer:
            'Yes — the Figma-to-Jira actions live on the Jira connector and require both connections to be active.',
        },
      ],
      productNote:
        'Figma is one of {connectorCount} workspace connectors in ClawAI, most useful paired with Jira.',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'AI ClickUp integration — ClawAI',
        description:
          'Connect ClickUp to ClawAI to read tasks, spaces, and folders, and to create, update, and comment on tasks — from a conversation.',
        keywords: ['AI ClickUp assistant', 'ClickUp AI integration', 'AI task management'],
      },
      eyebrow: 'Project management',
      title: 'ClickUp',
      summary:
        'Connect a ClickUp workspace so ClawAI can read tasks, spaces, and folders, and create, update, or comment on tasks directly from a conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read tasks, spaces, folders, and comments. This connector does not currently support real-time webhook updates — the underlying webhook delivery cannot be verified as authentic, so sync happens on request rather than by push.',
            'On the write side: create a task, update a task, and comment on a task.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does ClickUp update in real time?',
          answer:
            'No — sync happens when requested rather than through a live push notification. Treat it the same way as Confluence or Google Drive: current as of the last sync, not live.',
        },
        {
          question: 'Can it move a task between statuses?',
          answer:
            'Task updates cover status and field changes on an existing task; the exact set of updatable fields depends on how your ClickUp workspace is configured.',
        },
      ],
      productNote:
        'ClickUp is one of {connectorCount} workspace connectors in ClawAI. Sync is scheduled, not real-time.',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'AI Google Drive integration — ClawAI',
        description:
          'Connect Google Drive to ClawAI to read documents and spreadsheets, and to upload and move files — with support for syncing only what changed.',
        keywords: [
          'AI Google Drive assistant',
          'AI document search',
          'Google Drive AI integration',
        ],
      },
      eyebrow: 'Files',
      title: 'Google Drive',
      summary:
        'Connect a Google Drive account so ClawAI can read files, documents, and spreadsheets, and upload or move files — with delta sync, so re-syncing a large Drive does not mean re-reading everything each time.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read files, documents, and spreadsheets. This connector supports delta sync — after the first full read, later syncs only fetch what actually changed, which matters once a Drive has thousands of files. It does not currently support real-time webhook updates; sync happens on request.',
            'On the write side: upload a file, and move a file between folders.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does connecting Drive give ClawAI access to everything in it?',
          answer:
            'Only what the connected Google account grants access to during OAuth — typically scoped to files the account can already open, not an organization-wide grant.',
        },
        {
          question: 'Will re-syncing a large Drive be slow every time?',
          answer:
            'The first sync reads what it needs to; delta sync means later syncs only fetch changes, so it does not get slower as the Drive grows once the initial sync is done.',
        },
      ],
      productNote:
        'Google Drive is one of {connectorCount} workspace connectors in ClawAI, with delta sync for large libraries.',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'AI Gmail integration — ClawAI',
        description:
          'Connect Gmail to ClawAI to read threads and messages, and to send, reply, and draft email — from a conversation.',
        keywords: ['AI Gmail assistant', 'AI email integration', 'Gmail AI integration'],
      },
      eyebrow: 'Email',
      title: 'Gmail',
      summary:
        'Connect a Gmail account so ClawAI can read threads, messages, and labels, and send, reply to, or draft email directly from a conversation — with delta sync, so it does not re-read your whole mailbox on every check.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read email threads, messages, and labels, with delta sync. It does not currently support real-time push notifications for new mail — sync happens on request.',
            'On the write side: send a new email, reply to an existing thread, and create a draft without sending it — useful when you want ClawAI to prepare a reply for you to review before it goes out.',
          ],
        },
      ],
      faq: [
        {
          question: 'Will ClawAI send email without me approving it?',
          answer:
            'No. Sending is an explicit action; the draft action exists specifically for cases where you want to review before anything is sent.',
        },
        {
          question: 'Does it check my inbox continuously?',
          answer:
            'It syncs on request rather than through a live push connection, so new mail is visible as of the last sync, not instantly.',
        },
      ],
      productNote: 'Gmail is one of {connectorCount} workspace connectors in ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'AI SharePoint integration — ClawAI',
        description:
          'Connect Microsoft SharePoint to ClawAI to read documents and site lists, and to upload documents and manage list items — from a conversation.',
        keywords: [
          'AI SharePoint assistant',
          'SharePoint AI integration',
          'AI document search Microsoft',
        ],
      },
      eyebrow: 'Files',
      title: 'Microsoft SharePoint',
      summary:
        'Connect a Microsoft SharePoint site so ClawAI can read documents, files, and site lists, and upload documents or manage list items directly from a conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read documents, files, and the lists that organize a SharePoint site. Sync happens on request rather than through a real-time push connection.',
            'On the write side: upload a document, create a list item, and update an existing list item.',
          ],
        },
        {
          id: 'authentication',
          heading: 'How you connect it',
          paragraphs: [
            "SharePoint requires your Microsoft tenant ID alongside OAuth, so the connector knows which organization's SharePoint to reach.",
          ],
        },
      ],
      faq: [
        {
          question: 'Does it need my Microsoft 365 tenant ID?',
          answer:
            "Yes — SharePoint is tenant-scoped, so the connector needs your tenant ID to know which organization's SharePoint to connect to.",
        },
        {
          question: 'Is content updated in real time?',
          answer: 'No — sync happens on request, not through a live push notification.',
        },
      ],
      productNote: 'SharePoint is one of {connectorCount} workspace connectors in ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'AI OneDrive integration — ClawAI',
        description:
          'Connect Microsoft OneDrive to ClawAI to read files and documents, and to upload and move files — with support for syncing only what changed.',
        keywords: ['AI OneDrive assistant', 'OneDrive AI integration', 'AI file search Microsoft'],
      },
      eyebrow: 'Files',
      title: 'Microsoft OneDrive',
      summary:
        'Connect a Microsoft OneDrive account so ClawAI can read files and documents, and upload or move files directly from a conversation — with delta sync for large libraries.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read files and documents, with delta sync — after the first full read, later syncs only fetch what changed. Real-time push notifications are not currently supported; sync happens on request.',
            'On the write side: upload a file, and move a file between folders.',
          ],
        },
        {
          id: 'authentication',
          heading: 'How you connect it',
          paragraphs: [
            'OneDrive requires your Microsoft tenant ID alongside OAuth, the same as SharePoint.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does it need my Microsoft 365 tenant ID?',
          answer: 'Yes, the same way SharePoint does — OneDrive for Business is tenant-scoped.',
        },
        {
          question: 'Is a large OneDrive slow to keep in sync?',
          answer:
            'The first sync is the expensive one; delta sync means subsequent syncs only fetch what actually changed.',
        },
      ],
      productNote:
        'OneDrive is one of {connectorCount} workspace connectors in ClawAI, with delta sync for large libraries.',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'AI Google Calendar integration — ClawAI',
        description:
          'Connect Google Calendar to ClawAI to read meetings and events, and to create a calendar event — from a conversation.',
        keywords: [
          'AI Google Calendar assistant',
          'Google Calendar AI integration',
          'AI schedule meeting',
        ],
      },
      eyebrow: 'Calendar',
      title: 'Google Calendar',
      summary:
        'Connect a Google Calendar so ClawAI can read your meetings and events, and create a new calendar event directly from a conversation, with delta sync so checking your schedule stays fast.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read meetings and events, with delta sync. Real-time push notifications are not currently supported.',
            'On the write side, the connector currently supports one action: creating a calendar event. Rescheduling, deleting, or responding to an existing invite are not yet supported write actions — this page will be updated if that changes.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can ClawAI reschedule an existing meeting for me?',
          answer:
            'Not yet — the connector currently supports creating a new event, not editing or rescheduling an existing one.',
        },
        {
          question: 'Does it see my whole calendar, including other calendars I have access to?',
          answer:
            'Access is scoped to what you grant during connection, which is typically your primary calendar unless you explicitly extend it.',
        },
      ],
      productNote:
        'Google Calendar is one of {connectorCount} workspace connectors in ClawAI. Its write action is currently limited to creating events.',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'AI Outlook Calendar integration — ClawAI',
        description:
          'Connect Outlook Calendar to ClawAI to read meetings and events, and to create a calendar event — from a conversation.',
        keywords: [
          'AI Outlook Calendar assistant',
          'Outlook AI integration',
          'AI schedule meeting Microsoft',
        ],
      },
      eyebrow: 'Calendar',
      title: 'Outlook Calendar',
      summary:
        'Connect a Microsoft Outlook Calendar so ClawAI can read your meetings and events, and create a new calendar event directly from a conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'What the connector covers',
          paragraphs: [
            'ClawAI can read meetings and events. This connector does not currently support delta sync or real-time push notifications — each sync reads what it needs on request.',
            'On the write side, the connector currently supports one action: creating a calendar event. Rescheduling, deleting, or responding to an existing invite are not yet supported.',
          ],
        },
        {
          id: 'authentication',
          heading: 'How you connect it',
          paragraphs: [
            "Outlook Calendar supports OAuth with an optional tenant ID — leave it blank to use Microsoft's multi-tenant endpoint, or set it for a specific organization.",
          ],
        },
      ],
      faq: [
        {
          question: 'Can ClawAI reschedule an existing meeting for me?',
          answer: 'Not yet — only creating a new event is currently supported.',
        },
        {
          question: 'Do I need to set a tenant ID?',
          answer:
            'Only if you want the connector scoped to a specific Microsoft organization. Leaving it blank uses the multi-tenant endpoint, which works for most personal and organizational accounts.',
        },
      ],
      productNote:
        'Outlook Calendar is one of {connectorCount} workspace connectors in ClawAI. Its write action is currently limited to creating events.',
    },
  },
};
