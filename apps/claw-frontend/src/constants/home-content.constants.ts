import type {
  FaqEntry,
  IntegrationHighlight,
  MessageFlowStep,
  OrchestrationPrimitive,
  RoutingModeDescriptor,
  UseCaseEntry,
} from '@/types/home-content.types';

export const ROUTING_MODES: ReadonlyArray<RoutingModeDescriptor> = [
  {
    name: 'Auto',
    description:
      'a five-stage pipeline (privacy, image, file, category, then a local-model or heuristic classifier) picks a provider and model per message',
  },
  { name: 'Manual', description: 'you pin a specific provider and model for a thread' },
  {
    name: 'Local-only',
    description:
      'every request stays on your local runtime, category-aware (coding, reasoning, or general)',
  },
  {
    name: 'Privacy-first',
    description:
      'local when healthy, falling back to a configured cloud provider only when necessary',
  },
  {
    name: 'Low-latency / High-reasoning / Cost-saver',
    description: 'bias routing toward speed, reasoning depth, or the cheapest healthy option',
  },
];

export const MESSAGE_FLOW_STEPS: ReadonlyArray<MessageFlowStep> = [
  {
    title: 'You send a message',
    description: 'in a thread, optionally attaching files or pinning a provider and model.',
  },
  {
    title: 'Routing decides where it goes',
    description: 'based on the active routing mode, message content, and connector health.',
  },
  {
    title: 'Context is assembled',
    description:
      'relevant memories, attached context packs, and file chunks are retrieved and merged into the prompt within a token budget, alongside the thread history.',
  },
  {
    title: 'The model responds',
    description:
      'streamed back over a live connection with token, reasoning, and metric updates as they happen, with automatic fallback if a provider fails.',
  },
  {
    title: 'The exchange is remembered',
    description:
      'facts, preferences, and instructions worth keeping are extracted for future conversations, and the full exchange is recorded for audit.',
  },
];

export const ORCHESTRATION_PRIMITIVES: ReadonlyArray<OrchestrationPrimitive> = [
  {
    name: 'Parallel compare',
    description:
      'send one prompt to two to five models at once and see every response side by side, with per-model latency and token counts.',
  },
  {
    name: 'Consensus',
    description:
      'run the same prompt across several models and synthesize a single answer from where they agree.',
  },
  {
    name: 'Escalation chains',
    description:
      'start with a fast, cheap model and automatically escalate to a stronger one when quality falls short of a threshold.',
  },
  {
    name: 'Best-of-N',
    description:
      'generate several candidate answers and select the strongest one by a scoring pass.',
  },
  {
    name: 'Answer repair',
    description:
      'detect and correct specific classes of errors in a prior response rather than regenerating from scratch.',
  },
  {
    name: 'Verification',
    description:
      'have a second pass check a response for correctness before it reaches you, with configurable revision limits.',
  },
  {
    name: 'Role packs',
    description:
      'run a prompt through a small team of role-specialized models (for example, a planner, a critic, and a writer) that hand off to one another.',
  },
  {
    name: 'Pipelines',
    description: 'chain multiple orchestration stages into a single named, repeatable workflow.',
  },
  {
    name: 'Judge & Critic review',
    description:
      'an optional independent model reviews and scores a generated response before it is treated as final.',
  },
];

export const INTEGRATION_HIGHLIGHTS: ReadonlyArray<IntegrationHighlight> = [
  {
    name: 'Workspace connectors',
    description:
      'connect GitHub, GitLab, Jira, Slack, Google Drive, OneDrive, SharePoint, Confluence, Figma, Gmail, Bitbucket, and ClickUp via OAuth2/PKCE, with webhook and scheduled background sync so ClawAI can search and act on your existing tools.',
  },
  {
    name: 'Desktop agent',
    description:
      'a companion agent that can propose filesystem, process, browser, and terminal actions on a paired device, each classified by risk and blast radius.',
  },
  {
    name: 'Human approval',
    description:
      'sensitive or high-impact agent actions require your explicit approval before they run, and every invocation is logged with an undo plan when one exists.',
  },
  {
    name: 'Image generation',
    description:
      'generate images through local Stable Diffusion / ComfyUI runtimes or connected cloud image providers.',
  },
  {
    name: 'File & document generation',
    description: 'export structured output as PDF, DOCX, CSV, HTML, Markdown, TXT, or JSON.',
  },
];

export const FAQ_ENTRIES: ReadonlyArray<FaqEntry> = [
  {
    question: 'Do I need a cloud API key to use ClawAI?',
    answer:
      'No. ClawAI ships with a local Ollama-based runtime that handles routing and chat out of the box. Cloud providers are optional connectors you can add if you want them.',
  },
  {
    question: 'Can I self-host the whole platform?',
    answer:
      'Yes. ClawAI is designed to run on your own infrastructure via Docker Compose, with local TLS, its own PostgreSQL and MongoDB instances, and no required external services.',
  },
  {
    question: 'What happens to data I send to a cloud provider?',
    answer:
      'That depends on the provider you connect and the routing mode you choose. Privacy-first and local-only modes keep requests on your local runtime; routing decisions record which provider handled each message so you can audit where your data went.',
  },
  {
    question: 'Is ClawAI affiliated with OpenAI, Anthropic, Google, or AWS?',
    answer:
      'No. ClawAI is an independent, open-source orchestration layer that can connect to those providers’ APIs when you configure your own credentials. It is not endorsed by or affiliated with them.',
  },
];

export const USE_CASE_ENTRIES: ReadonlyArray<UseCaseEntry> = [
  {
    name: 'Privacy-conscious teams',
    description:
      'keep sensitive conversations and documents on infrastructure you control, with cloud models available only when you choose to use them.',
  },
  {
    name: 'Developers evaluating models',
    description:
      'compare responses from multiple local and cloud models side by side on the same prompt before committing to one.',
  },
  {
    name: 'Self-hosters and homelab users',
    description:
      'run a full AI assistant stack, including local model management, on hardware you own.',
  },
  {
    name: 'Small teams automating workflows',
    description:
      'connect existing tools (issue trackers, chat, docs, source control) and let approval-gated agent actions handle routine work.',
  },
];
