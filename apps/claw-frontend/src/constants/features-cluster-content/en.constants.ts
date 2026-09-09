import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesClusterDictionary } from '@/types/features-cluster.types';

export const EN_FEATURES_CLUSTER_CONTENT: FeaturesClusterDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All features',
    ctaTitle: 'Try it rather than take our word for it',
    ctaBody:
      'ClawAI routes a conversation to the model and tools that fit the job, across every provider it connects to, from one workspace.',
    startFree: 'Start on the free plan',
    seeUseCases: 'See it applied to a real job',
  },
  hub: {
    capabilitiesHeading: 'Go deeper on a specific capability',
    capabilitiesIntro:
      'The nine sections above are the short version. Each of the six capabilities below is a full page: what the underlying feature actually does, which plan gates it, and where to check the mechanism for yourself.',
    cardSummaries: {
      [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]:
        'Seven routing modes decide which model answers, and nine orchestration primitives put several models on one problem.',
      [FeatureCapability.MEMORY_AND_CONTEXT]:
        'Memory that carries between conversations, and context packs that hold reference material for a task.',
      [FeatureCapability.WORKSPACE_CONNECTORS]:
        'Fourteen workspace connectors let a request read from or act on the tools your team already runs.',
      [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]:
        'Upload, chunking and OCR on the way in; image, document and research generation on the way out.',
      [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]:
        'Every answer records which model handled it, why, and what it cost against your allowance.',
      [FeatureCapability.SECURITY_AND_DATA_HANDLING]:
        'The concrete mechanisms — authentication, RBAC, credential encryption, transport encryption — described plainly.',
    },
  },
  capabilities: {
    [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: {
      seo: {
        title: 'Model routing and orchestration in ClawAI',
        description:
          'The seven routing modes that decide which model answers a message, and the nine orchestration primitives that put several models on one problem, both as shipped in ClawAI.',
        keywords: [
          'AI model routing modes',
          'multi-model orchestration',
          'AI routing transparency',
        ],
      },
      eyebrow: 'Feature',
      title: 'Model routing and orchestration',
      summary:
        'Routing decides which single model answers a message; orchestration decides what to do when one model is not enough. ClawAI ships both as distinct, plan-gated mechanisms rather than a single hidden default — seven routing modes and nine orchestration primitives, all visible in the response you get back.',
      sections: [
        {
          id: 'seven-routing-modes',
          heading: 'Seven routing modes, not one hidden default',
          paragraphs: [
            'ClawAI classifies each message and can send it to a fitting model automatically, or you can decide the policy yourself. The routing modes are Auto (classifies by task and picks a strong model for that class), Manual Model (pins one model to the conversation), Local-Only (every request stays on hardware you control, via Ollama or llama.cpp), Privacy-First (a separate mode with its own priorities for keeping a request out of a general-purpose cloud path), Low Latency (prefers the model that can respond most quickly), High Reasoning (prefers the strongest reasoning model regardless of speed or cost) and Cost Saver (prefers the cheapest model that can still handle the request). See what is AI model routing, linked below, for how a router decides in general.',
          ],
        },
        {
          id: 'nine-orchestration-primitives',
          heading: 'Nine ways to put more than one model on a problem',
          paragraphs: [
            'When one model is not enough, ClawAI’s orchestration primitives — recorded on the ledger under the ORCHESTRATION surface, separate from ordinary chat — are Compare (up to five models on one prompt, side by side), Consensus (synthesise one answer from where several models agree, and flag where they do not), Escalation (start cheap, move up automatically only when quality falls short), Best-of-N (generate several candidates, keep the strongest), Repair (fix a specific defect in an existing answer instead of regenerating it), Verify (a second model checks correctness with a configurable revision limit), Role packs (a small team of role-specialised models handing off to each other), Pipelines (chain several of these stages into one named, re-runnable workflow) and Judge and Critic (an independent model scores a response against explicit criteria, with a written Critic pass on what is weak). Compare and Judge are each individually plan-gated (COMPARE_MODE, JUDGE_MODE, CRITIC_REVIEW); see what is AI consensus and what is an AI judge, both linked below, for how the assessment itself works.',
          ],
        },
        {
          id: 'automatic-fallback-on-provider-failure',
          heading: 'What happens when a provider fails mid-request',
          paragraphs: [
            'A routing decision is not a one-time bet: if the provider or model a request was sent to fails mid-request, ClawAI can fail over to another model automatically, and the response records which model actually stepped in — not just the one originally chosen. See what is model fallback, linked below, for how that failover decision itself gets made.',
          ],
        },
      ],
      faq: [
        {
          question: 'How many routing modes does ClawAI have?',
          answer:
            'Seven: Auto, Manual Model, Local-Only, Privacy-First, Low Latency, High Reasoning and Cost Saver. Auto is the default; the other six exist for when you want the routing decision yourself, or biased in a specific direction.',
        },
        {
          question: 'What is the difference between Compare and Consensus?',
          answer:
            'Compare shows every model’s answer to the same prompt side by side, with per-model latency and token counts, and leaves the reading to you. Consensus synthesises one answer from where the models agree and flags where they do not.',
        },
        {
          question: 'Can I see which model actually answered, and why?',
          answer:
            'Yes — every answer carries the provider and model that produced it, the reasoning behind the routing choice, and what it cost against your allowance. If a provider failed and another model stepped in, that is recorded too.',
        },
      ],
      productNote:
        'Seven routing modes and nine orchestration primitives are real, shipped mechanisms in ClawAI, not a single hidden default — Compare, Judge and Critic are each individually plan-gated and metered on their own ledger surface.',
    },
    [FeatureCapability.MEMORY_AND_CONTEXT]: {
      seo: {
        title: 'Memory and context in ClawAI',
        description:
          'How ClawAI’s memory and context packs work — approved memory records with a confidence score, scoped storage, and versioned reference-material bundles, as shipped plan-gated features.',
        keywords: ['AI memory feature', 'AI context packs', 'persistent AI conversation memory'],
      },
      eyebrow: 'Feature',
      title: 'Memory and context',
      summary:
        'Memory and context packs are two distinct, plan-gated features (MEMORY and CONTEXT_PACKS) that solve different problems: memory persists what ClawAI has learned about you across sessions, while a context pack bundles reference material for a specific task. Both are switches on each conversation, not something you have to manage globally.',
      sections: [
        {
          id: 'memory-records-and-approval',
          heading: 'Memory records, and the approval queue in front of them',
          paragraphs: [
            'A memory record is a fact, preference, instruction or summary, stored with a category, a confidence score and a record of where it came from. Nothing is remembered silently: candidates land in a queue you approve or reject, and only high-confidence, non-sensitive items are auto-approved, at a threshold you set yourself. See what is AI memory, linked below, for how a memory feature works as a general mechanism.',
          ],
        },
        {
          id: 'context-packs-for-reference-material',
          heading: 'Context packs for material a task needs in view',
          paragraphs: [
            'A context pack bundles reusable text, files, links and memory references into a named, versioned unit you attach to any conversation — so a style brief, a set of source documents, or standing instructions do not have to be re-pasted every session. Packs are versioned, so you can see what changed and roll back. See what are context packs, linked below, for how the feature works in general.',
          ],
        },
        {
          id: 'scopes-receipts-and-controls',
          heading: 'Scopes, context receipts and controls',
          paragraphs: [
            'A memory can be scoped to yourself, to one conversation, to a project or to a workspace, so work context does not leak into personal chats. Every answer that draws on memory or a pack records a context receipt — which items went into the prompt, in what order, and how much of the token budget each consumed — and controls let you pause all memory, pause one item, set an expiry, mark something sensitive for redaction, or delete it outright, each change written to an audit log. See what is a context window, linked below, for why that token-budget accounting matters.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does ClawAI remember things about me without asking?',
          answer:
            'No — candidates land in an approval queue you review yourself. Only high-confidence, non-sensitive items are auto-approved, at a threshold you set, and every change to a memory record is written to an audit log.',
        },
        {
          question: 'What is the difference between memory and a context pack?',
          answer:
            'Memory persists what ClawAI has learned about your preferences across sessions. A context pack is a versioned bundle of reference material — text, files, links — you attach to a specific task rather than a long-term preference. They are two separate plan-gated features.',
        },
        {
          question: 'Can I turn memory off for a single question?',
          answer:
            'Yes — memory and context packs are switches on each conversation. Turn them off for a one-off question and the prompt contains nothing but what you typed.',
        },
      ],
      productNote:
        'Memory and context packs are two separate, plan-gated ClawAI features (MEMORY, CONTEXT_PACKS) — approved records with a confidence score, and versioned reference bundles, both scoped and auditable, not a single blended memory blob.',
    },
    [FeatureCapability.WORKSPACE_CONNECTORS]: {
      seo: {
        title: 'Workspace connectors in ClawAI',
        description:
          'The 14 workspace connectors ClawAI ships — GitHub, Slack, Jira, Google Drive and more — and how a plan-gated workspace action reads from or acts on them.',
        keywords: [
          'AI workspace connectors',
          'connect AI to GitHub and Slack',
          'AI tool integrations',
        ],
      },
      eyebrow: 'Feature',
      title: 'Workspace connectors',
      summary:
        'A workspace connector lets a ClawAI request read from or act on a tool your team already runs, instead of you copying information back and forth by hand. ClawAI has 14 workspace connectors today, and workspace access is its own plan-gated feature (WORKSPACES) with its own metered usage surface (WORKSPACE_ACTION).',
      sections: [
        {
          id: 'the-fourteen-connectors',
          heading: 'The fourteen connectors, by category',
          paragraphs: [
            'Code hosting: GitHub, GitLab, Bitbucket. Messaging and tracking: Slack, Jira, Confluence, ClickUp. Design: Figma. Documents and storage: Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive. Calendars: Google Calendar, Outlook Calendar. Each connects once over OAuth, and credentials are encrypted at rest, scoped to your account and revocable in one click.',
          ],
        },
        {
          id: 'what-a-connected-workspace-can-do',
          heading: 'What a connected workspace actually lets a request do',
          paragraphs: [
            'Once connected, ClawAI can search a tool, pull context from it into a conversation, and act on it when you approve the action — a Jira ticket, a Slack thread, a file in Google Drive, referenced or changed directly rather than pasted in by hand. Connections sync on a schedule and on webhooks, so search results stay current, and how many connections you can hold depends on your plan.',
          ],
        },
        {
          id: 'multi-model-review-inside-a-workspace-action',
          heading: 'Multi-model review as part of the same metered surface',
          paragraphs: [
            'A workspace action is not limited to a single model call — a chain-drafting or handoff step, or a multi-model review of the result before it is acted on, uses the same routing and orchestration infrastructure described in model routing and orchestration, linked below, applied to an action that touches a connected tool rather than to an ordinary chat message.',
          ],
        },
      ],
      faq: [
        {
          question: 'How many tools does ClawAI connect to?',
          answer:
            'Fourteen workspace connectors: GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, ClickUp, Figma, Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive, Google Calendar and Outlook Calendar.',
        },
        {
          question: 'Are my connector credentials safe?',
          answer:
            'Credentials are encrypted at rest, scoped to your account, and never returned to the browser — see the security and data handling page, linked below, for the underlying mechanism.',
        },
        {
          question: 'Is a workspace action metered separately from an ordinary chat message?',
          answer:
            'Yes — workspace actions are their own metered surface (WORKSPACE_ACTION), separate from the token allowance an ordinary chat message draws on. Confirm the current allowance on the pricing page.',
        },
      ],
      productNote:
        'ClawAI connects to 14 workspace tools today — code hosting, messaging, project tracking, design, documents, storage and calendars — behind a single plan-gated WORKSPACES feature with its own metered action surface.',
    },
    [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: {
      seo: {
        title: 'File and document handling in ClawAI',
        description:
          'How ClawAI ingests files — upload, chunking, OCR, upload checks — and generates them back out as images, documents and research runs with cited sources.',
        keywords: [
          'AI file upload and OCR',
          'AI document generation',
          'AI document export formats',
        ],
      },
      eyebrow: 'Feature',
      title: 'File and document handling',
      summary:
        'Files move through ClawAI in both directions: in, as an upload that gets chunked and indexed so a model answers from your content rather than only its training data; and out, as a generated image, an exported document, or a research run with cited sources. Both directions are real, shipped, and separately metered.',
      sections: [
        {
          id: 'upload-chunking-and-retrieval',
          heading: 'Upload, chunking and per-model delivery',
          paragraphs: [
            'ClawAI accepts PDF, DOCX, spreadsheets, CSV, JSON, Markdown, plain text, code files and images. A file is split into passages and indexed, so only the parts relevant to a question are pulled into the prompt, and each model receives the form it handles most reliably — a native image, a native PDF, or extracted text — with every message showing which form each model actually got. Files can be attached per message, including in Compare runs, so several models can be asked about the same document at once.',
          ],
        },
        {
          id: 'ocr-and-upload-checks',
          heading: 'OCR for scanned documents, and checks on every upload',
          paragraphs: [
            'A scanned PDF with no text layer is run through OCR before it reaches a model, and flagged when recognition confidence is low. Every upload is virus-scanned, checked against its declared file type, screened for dangerous filenames, and rejected if an archive turns out to be a decompression bomb — uploads count against a plan’s file size and storage limits, and files are removed on a retention schedule or deletable at any time.',
          ],
        },
        {
          id: 'generating-images-documents-and-research',
          heading: 'Generating images, documents and cited research',
          paragraphs: [
            'On the way out, ClawAI can produce an image from a description, export any answer or whole conversation as a formatted file in PDF, DOCX, CSV, HTML, Markdown, TXT or JSON, and run a research task that searches the web, fetches and reads pages, and answers with the sources it actually drew from. Image generation, file generation and research each meter separately (IMAGE, FILE_GENERATION, and the RESEARCH_MODE / WEB_SEARCH / WEB_FETCH / WEB_EXTRACT allowances), distinct from ordinary chat token usage. See how AI tool calling works and what are structured AI outputs, both linked below, for the mechanism behind a defined output shape.',
          ],
        },
      ],
      faq: [
        {
          question: 'What file types can I upload?',
          answer:
            'PDF, DOCX, spreadsheets, CSV, JSON, Markdown, plain text, code files and images. Each model receives the form it handles most reliably, and the message shows which form each model actually got.',
        },
        {
          question: 'Can ClawAI read a scanned document with no text layer?',
          answer:
            'Yes — a scanned PDF is run through OCR before it reaches a model, and flagged when the recognition confidence is low.',
        },
        {
          question: 'What formats can I export a document as?',
          answer:
            'PDF, DOCX, CSV, HTML, Markdown, TXT and JSON. Document export is its own metered surface, separate from ordinary chat and from research usage.',
        },
      ],
      productNote:
        'Upload, chunking, OCR and upload checks on the way in; image generation, document export and cited research runs on the way out — real, shipped, separately metered features, not one blended file mode.',
    },
    [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: {
      seo: {
        title: 'Observability and transparency in ClawAI',
        description:
          'How ClawAI shows what a request is spending — a usage dashboard, per-answer routing detail, an audit log and live progress — so usage is never a black box.',
        keywords: ['AI usage transparency', 'AI routing audit log', 'AI cost observability'],
      },
      eyebrow: 'Feature',
      title: 'Observability and transparency',
      summary:
        'Usage in ClawAI is metered, attributed and visible rather than a black box: a usage dashboard, per-answer routing detail, an audit log and live progress while a model works are four distinct, shipped pieces of the same principle — you can always see what a request did and what it cost.',
      sections: [
        {
          id: 'usage-dashboard-and-per-answer-detail',
          heading: 'The usage dashboard, and per-answer routing detail',
          paragraphs: [
            'A usage dashboard shows the allowance consumed today and this month, broken down by model, with the remaining balance in the same units a plan is quoted in. Underneath that, every individual answer carries the model that produced it, why it was chosen, how long it took, how many tokens it used, and what it cost against the allowance — including which model stepped in if the original provider failed mid-request. See what is AI model routing and what is model fallback, both linked below, for how that routing decision itself gets made.',
          ],
        },
        {
          id: 'the-audit-log',
          heading: 'An audit log for logins, plan changes and connector activity',
          paragraphs: [
            'Logins, plan changes, connector activity, memory edits and generated content are each recorded with a timestamp and an actor, so an account’s history is reconstructable rather than only visible in the moment it happened. This is the same audit trail referenced from the memory-and-context and security-and-data-handling pages, linked below, for the actions each of those features writes into it.',
          ],
        },
        {
          id: 'live-progress-and-limit-warnings',
          heading: 'Live progress while a model works, and clear limit warnings',
          paragraphs: [
            'While a model works you see the stage it is in, the text as it arrives, its reasoning when the model exposes it, and running token and timing counters — nothing is a silent wait. When a request reaches a plan limit, ClawAI states which limit, how much is left on the other windows, and when it resets, rather than cutting the request off with no explanation.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can I see which model answered a specific message, and why?',
          answer:
            'Yes — every answer records the provider and model that produced it, the reasoning behind the routing choice, how long it took, how many tokens it used, and what it cost against your allowance.',
        },
        {
          question: 'What does the audit log actually record?',
          answer:
            'Logins, plan changes, connector activity, memory edits and generated content, each with a timestamp and an actor, so an account’s history can be reconstructed after the fact.',
        },
        {
          question: 'What happens when I hit a usage limit?',
          answer:
            'ClawAI states which specific limit was hit, how much allowance remains on your other usage windows, and when the limit resets — nothing is cut off silently.',
        },
      ],
      productNote:
        'A usage dashboard, per-answer routing detail, an audit log and live progress are four real, shipped pieces of the same principle: usage in ClawAI is metered, attributed and visible, not a black box.',
    },
    [FeatureCapability.SECURITY_AND_DATA_HANDLING]: {
      seo: {
        title: 'Security and data handling in ClawAI',
        description:
          'The concrete mechanisms behind ClawAI account and data security — Argon2 password hashing, rotating refresh tokens, RBAC, AES-256-GCM credential encryption, TLS and service isolation — described plainly, with no compliance claims.',
        keywords: [
          'AI platform security',
          'AI credential encryption',
          'AI role-based access control',
        ],
      },
      eyebrow: 'Feature',
      title: 'Security and data handling',
      summary:
        'This page describes mechanisms that exist in the product today, plainly, rather than a compliance claim. Accounts, credentials, transport and service boundaries each have a specific, checkable mechanism behind them — and where a request needs to stay on hardware you control instead of reaching a cloud provider at all, Local-Only and Privacy-First routing are the answer to that, not a security certification.',
      sections: [
        {
          id: 'accounts-sessions-and-access-control',
          heading: 'Accounts, sessions and role-based access',
          paragraphs: [
            'Passwords are hashed with Argon2; access tokens are short-lived, and refresh tokens rotate on every use so a stolen token is detectable. Every account carries a role and an explicit permission set, checked in the interface and again on every backend endpoint — role-based access control applied at both layers, not only in what the interface happens to show.',
          ],
        },
        {
          id: 'credential-and-transport-encryption',
          heading: 'Credential encryption and encryption in transit',
          paragraphs: [
            'Provider and connector credentials are encrypted at rest with AES-256-GCM and are never returned to the browser. Transport is TLS from the browser to the edge, and TLS again between every internal service, with certificates verified at each hop — so a credential is protected both while stored and while it moves.',
          ],
        },
        {
          id: 'service-isolation-and-what-is-not-claimed',
          heading: 'Service isolation, rate limiting, and what is not claimed here',
          paragraphs: [
            'Each backend service owns its own database and cannot read another’s, so a failure in image generation cannot reach your conversations; per-account rate limits protect both your allowance and the platform from runaway loops. ClawAI holds no compliance certifications today, and the hosted app sends requests to third-party model providers under their own terms — where that will not work for an organisation, a private deployment inside your own network, running open-weight models only, is scoped individually; contact us to discuss it. For a request that has to stay on hardware you control by default, see private and local deployment, linked below.',
          ],
        },
      ],
      faq: [
        {
          question: 'How are my passwords and login tokens protected?',
          answer:
            'Passwords are hashed with Argon2. Access tokens are short-lived, and refresh tokens rotate on every use, so a stolen refresh token is detectable rather than silently reusable.',
        },
        {
          question: 'How are my connected-tool credentials stored?',
          answer:
            'Provider and connector credentials are encrypted at rest with AES-256-GCM and are never returned to the browser, whichever workspace connector they belong to.',
        },
        {
          question: 'Does ClawAI hold any third-party compliance certifications?',
          answer:
            'No — ClawAI holds no compliance certifications today. For a requirement the hosted app cannot meet, a private deployment inside your own network is scoped individually; see the local and private deployment use case, linked below.',
        },
      ],
      productNote:
        'Argon2 password hashing, rotating refresh tokens, RBAC checked on every backend endpoint, AES-256-GCM credential encryption, TLS at every hop and per-service database isolation — concrete mechanisms, described plainly, with no compliance certification claimed.',
    },
  },
};
