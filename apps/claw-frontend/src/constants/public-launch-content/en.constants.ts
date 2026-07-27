import type {
  PublicLaunchLabels,
  PublicLaunchPageDictionary,
} from '@/types/public-launch-content.types';

export const EN_PUBLIC_LAUNCH_LABELS: PublicLaunchLabels = {
  onThisPage: 'On this page',
  evidence: 'Repository-backed note',
  lastReviewed: 'Last reviewed',
  effectiveDate: 'Effective date',
  startFree: 'Create a free account',
  contactTeam: 'Contact the team',
  viewPricing: 'View pricing',
  readSecurity: 'Read security and privacy',
  baselineCatalog: 'Baseline subscription catalog',
  monthlyPrice: 'Monthly',
  yearlyPrice: 'Yearly',
  dailyAllowance: 'Daily weighted allowance',
  monthlyAllowance: 'Monthly weighted allowance',
  liveCheckoutNote:
    'These are the repository baseline prices and allowances. Live checkout confirms the active price before payment.',
  providerAvailabilityNote:
    'Models are synchronized from enabled providers. The exact catalog depends on configured credentials, provider availability, lifecycle status, and administrator policy.',
  routingRailTitle: 'One request, an inspectable route',
  routingRailSummary:
    'ClawAI evaluates the request and current policy before it selects an available execution path.',
  routingRailAlternative:
    'A request is evaluated, routed to an eligible provider, optionally compared, and returned with model identity and usage details.',
  evaluate: 'Evaluate',
  evaluateDescription: 'Read the task, available context, policy, and current eligibility.',
  route: 'Route',
  routeDescription: 'Select an active model path from the providers configured by the operator.',
  compare: 'Compare',
  compareDescription:
    'Use multi-model orchestration only when the chosen mode and allowance permit it.',
  receipt: 'Return',
  receiptDescription: 'Stream the answer with visible model provenance and usage information.',
};

export const EN_PUBLIC_LAUNCH_PAGES: PublicLaunchPageDictionary = {
  about: {
    eyebrow: 'About ClawAI',
    sections: [
      {
        id: 'purpose',
        title: 'A practical control plane for AI work',
        body: 'ClawAI brings conversations, model routing, files, memory, research, generation, and workspace actions into one coherent interface. The product is designed to reduce the operational friction of switching among providers while keeping the selected model, usage, and execution path visible to the person doing the work.',
      },
      {
        id: 'principles',
        title: 'Built around choice, evidence, and control',
        body: 'The platform does not treat one model as universally best. It can route by task, let a person select a model, compare several eligible answers, or ask an independent judge to review output. Availability always depends on the connectors, credentials, plan policy, and model lifecycle configured for the running environment.',
      },
      {
        id: 'architecture',
        title: 'Local-first operations, cloud-model reach',
        body: 'The repository contains a Next.js interface and independently deployable services connected through explicit HTTP and event boundaries. Operators can run the platform on their own infrastructure, connect supported cloud providers, or scope a local-model deployment whose hardware and integrations match the organisation’s requirements.',
      },
      {
        id: 'trust',
        title: 'Trust through inspectable facts',
        body: 'We publish architecture, pricing baselines, security controls, limitations, and review dates instead of substituting unsupported badges or invented customer proof. The source repository is available for technical review, while live provider catalogs and checkout remain authoritative for what is available in a particular deployment.',
      },
    ],
    evidence:
      'ClawAI is an open repository with 18 NestJS services, a Next.js frontend, shared packages, RabbitMQ events, and database-per-service ownership. Product claims on this site are constrained to behavior visible in that repository.',
  },
  pricing: {
    eyebrow: 'Clear subscription baselines',
    sections: [
      {
        id: 'catalog',
        title: 'Seven starting points, from free to high-volume',
        body: 'The baseline catalog includes Free, Starter, Plus, Pro, Team, Scale, and Unlimited plans. Monthly prices range from zero to two hundred US dollars, with yearly prices set to ten monthly payments where yearly billing is available. The checkout service resolves the immutable active price on the server before creating a hosted payment.',
      },
      {
        id: 'allowances',
        title: 'Allowances are weighted, not raw token promises',
        body: 'Published daily, weekly, and monthly figures represent cost-normalized units. A more expensive model consumes the allowance differently from a low-cost model, which lets one balance cover heterogeneous providers. The catalog also defines conversation, message, concurrency, workspace, memory, and orchestration limits by plan.',
      },
      {
        id: 'models',
        title: 'Model access follows the live deployment',
        body: 'The repository default exposes active synchronized models unless an administrator creates explicit provider or model restrictions. Seeded cost-class policy is not proof of the rules in a deployed database, so this page does not promise a specific model on a specific tier. Confirm the live catalog before choosing a plan for one model.',
      },
      {
        id: 'payment',
        title: 'Server-priced hosted checkout',
        body: 'PayPal and Paymob integrations use hosted checkout, so card numbers do not pass through the ClawAI application. Canonical plan prices are stored in US dollars; a configured gateway may settle in another supported currency. Taxes, geographic availability, refunds, and gateway readiness depend on the deployed service and applicable terms.',
      },
    ],
    evidence:
      'Catalog values are a versioned repository baseline, not a guarantee that an administrator has not changed the active deployment. Checkout displays and charges the active server-side price.',
  },
  'supported-models': {
    eyebrow: 'Models and providers',
    sections: [
      {
        id: 'cloud',
        title: 'Implemented cloud-provider adapters',
        body: 'The connector service includes operational adapters for OpenAI, Anthropic, Google Gemini, DeepSeek, and xAI Grok. Each adapter synchronizes the provider catalog when valid credentials and configuration are present. Model names and availability can change upstream, so the live catalog is the reliable source for a running deployment.',
      },
      {
        id: 'local',
        title: 'Local execution through Ollama and llama.cpp',
        body: 'Operators can configure Ollama and llama.cpp for models that run on controlled infrastructure. A local-only routing mode keeps its fallback chain on local providers. Hardware fit, model licensing, context limits, quality, and throughput vary, so private-deployment model selection is handled during technical scoping rather than promised globally.',
      },
      {
        id: 'selection',
        title: 'Manual selection and policy-aware routing',
        body: 'People can choose an available model directly or allow routing logic to select an eligible path for the task. The router considers model capabilities, lifecycle, connector configuration, and policy. Multi-model modes add comparison and review patterns, but their availability and limits follow the active deployment rather than marketing copy.',
      },
      {
        id: 'availability',
        title: 'Why this page avoids a frozen version list',
        body: 'A static list of fashionable model versions becomes inaccurate quickly and can imply credentials that are not configured. ClawAI therefore distinguishes implemented provider families from live model availability. Models shown inside the product are synchronized from enabled connectors and filtered by lifecycle and any administrator restrictions.',
      },
    ],
    evidence:
      'AWS Bedrock exists as connector scaffolding in the repository but its model synchronization is not implemented, so it is deliberately not presented here as an available provider.',
  },
  'security-and-privacy': {
    eyebrow: 'Security and privacy',
    sections: [
      {
        id: 'credentials',
        title: 'Connector credentials are protected at rest',
        body: 'Provider and connector API keys are encrypted with AES-256-GCM using a random initialization vector and authentication tag, then masked in API responses. Payment gateway tokens use authenticated encryption with row-bound associated data. These controls support precise credential-protection claims, not a blanket claim about every stored byte.',
      },
      {
        id: 'boundaries',
        title: 'Explicit service and data boundaries',
        body: 'ClawAI separates service ownership and prevents one service from reaching directly into another service’s database. Requests cross authenticated HTTP boundaries or RabbitMQ events, while validation, authorization, rate limits, security headers, and audit records are applied at defined layers. Deployment configuration remains part of the security boundary.',
      },
      {
        id: 'retention',
        title: 'Retention differs by data type',
        body: 'Files default to a thirty-day expiry unless an operator configures indefinite retention. Client and server logs use thirty-day database expiry indexes, while audit records and usage ledgers have no automatic expiry in their current schemas. People can delete conversations, memories, context packs, and files; account deletion is not currently self-service.',
      },
      {
        id: 'processing',
        title: 'Provider processing is a deployment choice',
        body: 'Prompts and attachments sent to a cloud model are processed by that configured provider under its own terms. Local-only routing can keep model execution on local Ollama paths, but other enabled services may still involve external processors. Certifications, residency, regulatory compliance, and universal erasure guarantees require separate evidence and are not claimed here.',
      },
    ],
    evidence:
      'Security statements describe controls present in the repository. They are not a certification, penetration-test report, data-processing agreement, or guarantee about an operator’s final configuration.',
  },
  privacy: {
    eyebrow: 'Privacy notice',
    sections: [
      {
        id: 'data',
        title: 'Data the application handles',
        body: 'ClawAI processes account details, conversations, prompts, generated responses, selected model information, uploaded files, memories, context packs, usage records, audit events, support messages, and billing references needed to provide the service. Workspace connectors may process content and identifiers from services that an authorised user chooses to connect.',
      },
      {
        id: 'use',
        title: 'How data supports product operation',
        body: 'The application uses this data to authenticate users, run requested AI and workspace actions, maintain context, enforce configured access and allowances, troubleshoot failures, secure the platform, process hosted checkout, and answer support requests. External providers receive only the information required for the configured operation, subject to their own terms.',
      },
      {
        id: 'storage',
        title: 'Storage, retention, and deletion controls',
        body: 'Authentication tokens are currently stored in browser local storage, alongside preferences such as theme and locale; an optional remembered email may also be stored there. Files and operational logs have repository defaults described on the security page. Users can delete several content types, but full account deletion currently requires contacting the operator.',
      },
      {
        id: 'choices',
        title: 'Choices and questions',
        body: 'Users can avoid optional connectors, remove conversations, files, memories, and context packs, clear local browser storage, and choose local model routing when the deployment provides it. Requests concerning an account, operator practices, access, correction, or deletion should be sent through the contact page so the responsible operator can verify and respond.',
      },
    ],
    evidence:
      'This notice intentionally does not claim that data is never sold, never used for training, or always deleted on a universal schedule because those operational and provider commitments are not established by repository code alone.',
  },
  terms: {
    eyebrow: 'Terms of use',
    sections: [
      {
        id: 'service',
        title: 'Using the service',
        body: 'These terms govern access to the ClawAI application and its hosted or self-managed features. Users must provide accurate account information, protect their credentials, follow applicable law, and use only data, systems, and integrations they are authorised to access. Additional commercial terms may apply to a separately scoped private deployment.',
      },
      {
        id: 'availability',
        title: 'Models, integrations, and generated output',
        body: 'Model and provider availability can change with configuration, credentials, upstream services, lifecycle status, and administrator policy. Generated output may be incomplete, inaccurate, unsafe, or unsuitable for a particular purpose and must be reviewed before consequential use. ClawAI does not replace professional legal, medical, financial, or security judgment.',
      },
      {
        id: 'billing',
        title: 'Plans and payment',
        body: 'Paid subscriptions use the active price and billing interval shown at server-priced hosted checkout. Baseline catalog values on the marketing site may differ from an administrator’s current deployment. Gateway availability, settlement currency, taxes, cancellation timing, refunds, and other payment rights follow the checkout disclosure and applicable law.',
      },
      {
        id: 'changes',
        title: 'Changes, suspension, and contact',
        body: 'The operator may change features, limits, integrations, or these terms to maintain, secure, or improve the service. Access may be restricted for security risk, non-payment, unlawful conduct, or material breach. Updated terms should carry a new effective date, and questions or disputes should be raised through the contact page for review.',
      },
    ],
    evidence:
      'These product terms are a factual launch baseline and not jurisdiction-specific legal advice. The responsible operator should obtain counsel before relying on them for a production commercial service.',
  },
  cookies: {
    eyebrow: 'Cookies and browser storage',
    sections: [
      {
        id: 'cookie',
        title: 'The authentication marker cookie',
        body: 'After sign-in, the frontend sets a short marker cookie that tells routing middleware an authenticated session may exist. The marker is not the access credential, is readable by the client, and uses SameSite Lax. Access and refresh tokens are currently stored separately in browser local storage rather than in an HttpOnly authentication cookie.',
      },
      {
        id: 'local-storage',
        title: 'Local storage used by the interface',
        body: 'The browser may store authentication state, theme, locale, model-view preferences, transient composer information, and an email address only when the user chooses a remember-email option. Clearing site data removes these local values and can sign the user out or reset preferences without deleting server-side account content.',
      },
      {
        id: 'advertising',
        title: 'Optional advertising technology',
        body: 'The marketing layout contains a configuration-gated Google AdSense integration. The current repository does not provide a complete consent-management platform, so operators must not enable optional advertising storage where consent is legally required until they implement and verify an appropriate consent flow and regional policy.',
      },
      {
        id: 'control',
        title: 'Browser controls and updates',
        body: 'Users can inspect, block, or clear cookies and local storage through their browser, although blocking required storage can prevent authentication or preference persistence. Operators should update this notice when storage keys, analytics, advertising, payment, or embedded services change and should align the effective date with the deployed behavior.',
      },
    ],
    evidence:
      'This notice describes storage visible in the repository today. A deployed operator remains responsible for auditing additional scripts, proxies, analytics, and gateway behavior added through configuration.',
  },
  'acceptable-use': {
    eyebrow: 'Acceptable use',
    sections: [
      {
        id: 'authorised',
        title: 'Use systems and data you are authorised to use',
        body: 'Do not use ClawAI to access accounts, repositories, files, networks, devices, or third-party services without clear permission. Workspace actions and agent capabilities must remain within the authority granted by the relevant owner. Do not bypass approvals, access controls, rate limits, safety boundaries, or administrator policy.',
      },
      {
        id: 'harm',
        title: 'Do not facilitate harm or unlawful conduct',
        body: 'Do not use the service to create or distribute malware, credential theft, destructive instructions, targeted harassment, sexual exploitation, unlawful surveillance, deceptive impersonation, or material that violates applicable law or another person’s rights. High-impact decisions require qualified human review and appropriate safeguards.',
      },
      {
        id: 'platform',
        title: 'Protect service reliability and integrity',
        body: 'Do not probe, overload, scrape, reverse engineer, or interfere with a deployment except under an authorised security-testing agreement. Do not automate account creation, evade quotas, conceal abusive origin, manipulate billing, or use generated content to misrepresent provenance. Report suspected vulnerabilities through the contact path.',
      },
      {
        id: 'enforcement',
        title: 'Review and enforcement',
        body: 'The operator may investigate credible reports, preserve relevant audit evidence, limit a capability, suspend an account, or block access when reasonably necessary to protect users, providers, infrastructure, or legal obligations. Context, intent, severity, recurrence, and available remediation should inform any enforcement decision.',
      },
    ],
    evidence:
      'Acceptable-use controls complement technical authorization and provider policies; they do not replace them. Private deployments should adapt enforcement and reporting procedures to their organisation and jurisdiction.',
  },
};
