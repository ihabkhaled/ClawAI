import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCasesClusterDictionary } from '@/types/use-cases-cluster.types';

export const EN_USE_CASES_CLUSTER_CONTENT: UseCasesClusterDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All use cases',
    ctaTitle: 'Try it rather than take our word for it',
    ctaBody:
      'ClawAI routes a conversation to the model and tools that fit the job, across every provider it connects to, from one workspace.',
    startFree: 'Start on the free plan',
    seeFeatures: 'See what ClawAI does',
  },
  hub: {
    tasksHeading: 'Go deeper on a specific job',
    tasksIntro:
      'The cases above are the short version. Each of the seven jobs below is a full page: what the job actually needs, which ClawAI feature or routing mode handles it, and where to check the details for yourself.',
    cardSummaries: {
      [UseCaseTask.CODING_AND_DEVELOPMENT]:
        'Writing, editing and reviewing code, with the coding agent for multi-step changes.',
      [UseCaseTask.RESEARCH_AND_FACT_FINDING]:
        'Answers grounded in sources ClawAI actually looked up, not just training data.',
      [UseCaseTask.WRITING_AND_EDITING]:
        'Long-form drafting and editing that stays consistent across a whole document.',
      [UseCaseTask.COMPARING_MODEL_ANSWERS]:
        'Running the same prompt across models side by side, and having one judge the rest.',
      [UseCaseTask.WORKSPACE_AUTOMATION]:
        'Connecting the tools your team already uses so ClawAI can act inside them.',
      [UseCaseTask.STRUCTURED_DATA_EXTRACTION]:
        'Turning messy text or pages into structured output your own systems can consume.',
      [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]:
        'Keeping a request on hardware you control instead of a cloud provider.',
    },
  },
  tasks: {
    [UseCaseTask.CODING_AND_DEVELOPMENT]: {
      seo: {
        title: 'Coding and development with ClawAI',
        description:
          'How ClawAI supports coding — chat with a model for a quick fix, or hand a multi-step change to the coding agent. Grounded in the product, no invented benchmarks.',
        keywords: ['AI for coding', 'coding agent use case', 'AI pair programming workflow'],
      },
      eyebrow: 'Use case',
      title: 'Coding and development',
      summary:
        'Coding work in ClawAI spans two shapes: a quick question or a one-file edit answered in an ordinary chat, and a multi-step change — several files, a plan, a review — handed to the coding agent. Both share the same routing and provider catalog underneath.',
      sections: [
        {
          id: 'quick-fixes-in-chat',
          heading: 'Quick fixes and questions, in an ordinary chat',
          paragraphs: [
            'A single-file edit, an explanation of an error, or a short refactor is an ordinary ClawAI chat message like any other. The router can send it to a model suited to the task under Auto or High Reasoning routing, or you can pin a specific model under Manual Model mode if you already know which one a recurring kind of question needs — see choosing a model for coding, linked below, for what to weigh there.',
          ],
        },
        {
          id: 'multi-step-changes-with-the-coding-agent',
          heading: 'Multi-step changes with the coding agent',
          paragraphs: [
            'For a change that spans several files or steps — a feature, a migration, a refactor with a plan — ClawAI’s coding agent runs a turn-based loop against your codebase rather than answering in a single message, with its own metered usage surface separate from ordinary chat. See the coding agent page, linked below, for what it does and how it is installed.',
          ],
        },
        {
          id: 'connecting-your-repository',
          heading: 'Connecting the repository the work touches',
          paragraphs: [
            'Coding work often needs the repository itself in view, not just pasted snippets — ClawAI connects to GitHub, GitLab and Bitbucket as workspace connectors, so a request can reference the actual code, issues or pull requests it is working against instead of you copying files in by hand. See the integrations page, linked below, for the full connector list.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does ClawAI write code for me automatically?',
          answer:
            'For a small, well-specified change, an ordinary chat message often does the job. For a multi-step change across several files, the coding agent runs a turn-based loop against your codebase rather than answering once — see the coding agent page, linked below.',
        },
        {
          question: 'Can ClawAI see my actual repository?',
          answer:
            'Yes, once you connect it — ClawAI has workspace connectors for GitHub, GitLab and Bitbucket, so a coding request can reference real files, issues and pull requests instead of pasted snippets.',
        },
        {
          question: 'Which model should I use for coding?',
          answer:
            'This page does not name one — see choosing a model for coding, linked below, for what to weigh instead of a ranking.',
        },
      ],
      productNote:
        'ClawAI routes an ordinary coding question to a fitting model automatically, and hands a multi-step change to the coding agent — a real, shipped feature with its own metered usage, not a chat trick.',
    },
    [UseCaseTask.RESEARCH_AND_FACT_FINDING]: {
      seo: {
        title: 'Research and fact-finding with ClawAI',
        description:
          'How ClawAI’s Research mode searches, fetches and extracts from the web so an answer cites sources it actually looked up, billed separately from model credit.',
        keywords: ['AI research assistant', 'fact-finding with AI', 'AI answers with sources'],
      },
      eyebrow: 'Use case',
      title: 'Research and fact-finding',
      summary:
        'A research task asks for an answer grounded in sources looked up for that specific question, not only what a model learned during training. ClawAI’s Research mode is a shipped feature built for exactly this, with three depths and its own metering separate from ordinary chat.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'What Research mode actually does',
          paragraphs: [
            'Research mode lets a request search the web, fetch a page, or fetch and extract structured content from one, before ClawAI produces an answer — so the answer can cite sources retrieved for that question rather than relying only on training data. It is a plan-gated feature with three depths: search only, search plus fetch, or search plus fetch and extract.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Metered separately from your model credit',
          paragraphs: [
            'Research access — web search, page fetches and extraction — is metered as its own usage, separate from the token allowance an ordinary chat message draws on. Your plan’s research allowance and its model token allowance are two different lines, not one shared pool, so running research does not draw down the credit a coding or writing task would use.',
          ],
        },
        {
          id: 'picking-a-depth-for-the-question',
          heading: 'Picking a depth for the question at hand',
          paragraphs: [
            'A quick fact check usually needs only the search-only depth; a question that hinges on what a specific page actually says calls for search plus fetch; pulling structured data out of several pages at once is where search plus fetch and extract earns its cost. Matching the depth to the question keeps research usage proportionate rather than defaulting to the most expensive option every time.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does research use my model token credit?',
          answer:
            'No. Research access — web search, page fetches and extraction — is metered separately from the token allowance an ordinary chat message draws on. Confirm both allowances on the pricing page.',
        },
        {
          question: 'What is the difference between the three Research mode depths?',
          answer:
            'Search only returns results from a web search; search plus fetch also retrieves the page content; search plus fetch and extract additionally pulls structured content out of what it fetched.',
        },
        {
          question: 'Does the model I choose matter for research quality?',
          answer:
            'Yes — Research mode changes what sources a model can see, not how well it reads and reconciles them. See choosing a model for research with sources, linked below.',
        },
      ],
      productNote:
        'ClawAI’s Research mode can search, fetch, and fetch-and-extract from the web before a model answers — a real, shipped feature, metered separately from your model token credit.',
    },
    [UseCaseTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Writing and editing with ClawAI',
        description:
          'How ClawAI supports long-form drafting and editing — context packs for reference material, memory for a recurring style, and routing to a fitting model.',
        keywords: ['AI writing assistant', 'AI editing workflow', 'long-form drafting with AI'],
      },
      eyebrow: 'Use case',
      title: 'Writing and editing',
      summary:
        'Writing and editing in ClawAI range from a short rewrite to a long document that has to stay consistent from the first page to the last. Two features carry most of the weight once a document gets long: context packs for reference material, and memory for a style that should persist across sessions.',
      sections: [
        {
          id: 'reference-material-with-context-packs',
          heading: 'Keeping reference material in view with context packs',
          paragraphs: [
            'A style brief, past drafts, or source material a piece has to stay consistent with is a context problem before it is a writing problem — ClawAI’s context packs are a plan-gated feature for keeping that material available to a conversation instead of re-pasting it every session. See what are context packs, linked below, for how the feature works.',
          ],
        },
        {
          id: 'memory-for-a-recurring-voice',
          heading: 'Memory for a voice that should persist',
          paragraphs: [
            'A recurring writing task — a newsletter, a weekly report, a documentation style — benefits from ClawAI remembering established preferences across sessions rather than restating them every time. Memory is a separate plan-gated feature from context packs: context packs hold reference material for a task, memory holds what ClawAI has learned about how you want things written.',
          ],
        },
        {
          id: 'routing-a-writing-request',
          heading: 'Routing a writing or editing request to a fitting model',
          paragraphs: [
            'ClawAI’s router can send a writing or editing request to a fitting model automatically under Auto or Cost Saver routing, or you can pin one under Manual Model mode for a recurring task with a known style. See choosing a model for writing and editing, linked below, for what to weigh when picking one deliberately.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can ClawAI keep a style brief in view across a whole editing session?',
          answer:
            'Yes — context packs are built for exactly this, keeping reference material like a style brief or source document available to a conversation instead of re-pasting it. See what are context packs, linked below.',
        },
        {
          question: 'Does ClawAI remember how I like things written?',
          answer:
            'Memory can persist established preferences across sessions for a recurring writing task, separately from context packs, which hold task-specific reference material rather than long-term preferences.',
        },
        {
          question: 'Which model should I use for writing?',
          answer:
            'This page does not name one — see choosing a model for writing and editing, linked below, for what to weigh instead of a ranking.',
        },
      ],
      productNote:
        'ClawAI can hold reference material in view with context packs and remember a recurring style with memory — both real, plan-gated features, not chat tricks.',
    },
    [UseCaseTask.COMPARING_MODEL_ANSWERS]: {
      seo: {
        title: 'Comparing model answers with ClawAI',
        description:
          'How ClawAI’s Compare and Judge modes run one prompt across several models side by side and have a judge model assess the results — grounded in the shipped feature, no invented rankings.',
        keywords: ['compare AI model answers', 'AI model consensus', 'best-of-N AI responses'],
      },
      eyebrow: 'Use case',
      title: 'Comparing model answers',
      summary:
        'Sometimes the right move is not picking one model in advance but running the same prompt across several and looking at what comes back. ClawAI’s Compare mode does exactly this, and Judge mode can have a separate model assess the results rather than leaving you to read every response yourself.',
      sections: [
        {
          id: 'what-compare-mode-does',
          heading: 'What Compare mode does',
          paragraphs: [
            'Compare mode sends one prompt to several models at once and shows the responses side by side, so a decision that matters — a judgment call, an ambiguous request, a case where one model’s framing might be wrong — gets more than one perspective. It is a plan-gated feature, metered per lane rather than per run, so cost scales with how many models you compare.',
          ],
        },
        {
          id: 'consensus-and-best-of-n',
          heading: 'Consensus and best-of-N, explained properly',
          paragraphs: [
            'Two ideas describe what you do with several answers once you have them: consensus, where agreement across models is itself informative, and best-of-N, where you generate several candidates and pick or synthesize the strongest. See what is AI consensus and what is best-of-N, both linked below, for how each actually works rather than a marketing gloss.',
          ],
        },
        {
          id: 'judge-mode-and-critic-review',
          heading: 'Having a model judge the rest',
          paragraphs: [
            'Judge mode is a separate plan-gated feature that runs a second pass over a Compare run, with one model assessing the others rather than you reading every response by hand. Critic review is a related, separate feature for a second look at a single answer rather than a comparison across models — see what is an AI judge, linked below, for how the assessment actually works.',
          ],
        },
      ],
      faq: [
        {
          question: 'What is the difference between Compare mode and Judge mode?',
          answer:
            'Compare mode runs one prompt across several models and shows every response side by side. Judge mode is a separate, plan-gated second pass that has a model assess the results of a Compare run instead of you reading each one.',
        },
        {
          question: 'Does Compare mode cost more than an ordinary chat message?',
          answer:
            'Compare usage is metered per lane, not per run — running the same prompt against more models costs proportionately more. Confirm the current allowance on the pricing page.',
        },
        {
          question: 'What is best-of-N, and is it the same as consensus?',
          answer:
            'No — consensus treats agreement across model answers as informative in itself, while best-of-N generates several candidates and picks or synthesizes the strongest. See what is AI consensus and what is best-of-N, both linked below.',
        },
      ],
      productNote:
        'ClawAI’s Compare and Judge modes are real, shipped, plan-gated features — one prompt across several models, with an optional second model to assess the results.',
    },
    [UseCaseTask.WORKSPACE_AUTOMATION]: {
      seo: {
        title: 'Workspace automation with ClawAI',
        description:
          'How ClawAI connects to the tools a team already uses — GitHub, Slack, Jira, Google Drive and more — so a request can act inside them, not just talk about them.',
        keywords: ['AI workspace automation', 'AI tool connectors', 'connect AI to Slack and Jira'],
      },
      eyebrow: 'Use case',
      title: 'Workspace automation',
      summary:
        'A workspace connector lets a ClawAI request read from or act on a tool your team already runs, instead of you copying information back and forth by hand. ClawAI has 14 workspace connectors today, spanning code hosting, chat, project tracking, documents and calendars.',
      sections: [
        {
          id: 'what-a-workspace-connector-is',
          heading: 'What a workspace connector actually does',
          paragraphs: [
            'A connected workspace lets a request reference or act on real data in that tool — a Jira ticket, a Slack thread, a file in Google Drive — rather than you pasting it into the conversation. Workspace access is a plan-gated feature, and connector actions are metered as their own surface, separate from ordinary chat.',
          ],
        },
        {
          id: 'which-tools-connect',
          heading: 'Which tools ClawAI connects to',
          paragraphs: [
            'ClawAI’s connectors span code hosting (GitHub, GitLab, Bitbucket), messaging and tracking (Slack, Jira, Confluence, ClickUp), design (Figma), documents and storage (Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive) and calendars (Google Calendar, Outlook Calendar). See the integrations page, linked below, for what each one does.',
          ],
        },
        {
          id: 'multi-model-review-and-handoff',
          heading: 'Multi-model review and handoff inside a workspace action',
          paragraphs: [
            'A workspace action can involve more than a single model call — a chain-drafting or handoff step, or a multi-model review of the result before it is acted on, is part of the same metered surface rather than a separate feature you have to enable. This is the same routing infrastructure the rest of ClawAI uses, applied to actions that touch a connected tool.',
          ],
        },
      ],
      faq: [
        {
          question: 'How many tools does ClawAI connect to?',
          answer:
            'Fourteen workspace connectors today, spanning code hosting, messaging, project tracking, design, documents, storage and calendars. See the integrations page, linked below, for the full list.',
        },
        {
          question: 'Can ClawAI act on a connected tool, or only read from it?',
          answer:
            'Workspace actions can act on a connected tool, not only read from it — the specifics depend on the connector and your plan’s workspace allowance.',
        },
        {
          question: 'Is workspace automation metered separately from ordinary chat?',
          answer:
            'Yes — connector actions are metered as their own usage surface, separate from the token allowance an ordinary chat message draws on. Confirm the current allowance on the pricing page.',
        },
      ],
      productNote:
        'ClawAI connects to 14 workspace tools today — code hosting, messaging, project tracking, design, documents and calendars — with its own metered usage surface for actions inside them.',
    },
    [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: {
      seo: {
        title: 'Structured data extraction with ClawAI',
        description:
          'How ClawAI turns unstructured text and pages into structured output — tool calling for a defined schema, and Research mode’s extract depth for web pages.',
        keywords: [
          'AI structured data extraction',
          'AI JSON output',
          'extract data from text with AI',
        ],
      },
      eyebrow: 'Use case',
      title: 'Structured data extraction',
      summary:
        'Turning messy text, a document, or a web page into a defined structure your own systems can consume is a different job from writing prose — it leans on tool calling to a fixed schema and, when the source is a web page, ClawAI’s Research mode extract depth.',
      sections: [
        {
          id: 'tool-calling-for-a-defined-schema',
          heading: 'Tool calling for a defined output schema',
          paragraphs: [
            'When a request needs its output in a specific shape — a fixed set of fields, a defined JSON structure — ClawAI’s tool-calling mechanism is what makes that reliable rather than hoping a plain-text answer parses correctly. See how AI tool calling works and what are structured AI outputs, both linked below, for how the mechanism actually works.',
          ],
        },
        {
          id: 'extracting-from-a-web-page',
          heading: 'Extracting structured content from a web page',
          paragraphs: [
            'When the source is a live web page rather than text you already have, Research mode’s search-plus-fetch-and-extract depth pulls structured content out of what it fetches, as part of the same feature used for research with sources. It is metered as research usage, separate from the token allowance an ordinary chat message draws on.',
          ],
        },
        {
          id: 'file-generation-for-the-output',
          heading: 'Generating a file from the extracted result',
          paragraphs: [
            'Once data is extracted, ClawAI’s document and file generation can turn it into a downloadable artifact rather than leaving the result only in the chat transcript — its own metered surface, separate from ordinary chat and from research.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can ClawAI guarantee valid JSON output?',
          answer:
            'Tool calling to a defined schema is what makes structured output reliable, rather than parsing a plain-text answer after the fact. See how AI tool calling works, linked below, for the mechanism.',
        },
        {
          question: 'Can ClawAI extract structured data from a web page, not just text I paste?',
          answer:
            'Yes — Research mode’s search-plus-fetch-and-extract depth pulls structured content out of a web page it fetches, metered as research usage separate from ordinary chat.',
        },
        {
          question: 'Can I get the extracted result as a file rather than just chat text?',
          answer:
            'Yes — document and file generation can turn an extracted result into a downloadable artifact, on its own metered usage surface.',
        },
      ],
      productNote:
        'ClawAI’s tool calling to a defined schema, and Research mode’s extract depth for web pages, are real, shipped features behind structured data extraction — not a single prompt trick.',
    },
    [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: {
      seo: {
        title: 'Private and local deployment with ClawAI',
        description:
          'How ClawAI’s Local-Only and Privacy-First routing modes keep a request on hardware you control, using the Ollama and llama.cpp connectors rather than a cloud provider.',
        keywords: [
          'private AI deployment',
          'local AI workloads',
          'run AI models on your own hardware',
        ],
      },
      eyebrow: 'Use case',
      title: 'Private and local deployment',
      summary:
        'Some work has to stay on hardware you control rather than reaching a cloud provider at all. ClawAI has live connectors to Ollama and llama.cpp for exactly this, plus routing modes that keep a request local by policy rather than by accident.',
      sections: [
        {
          id: 'what-local-deployment-changes',
          heading: 'What running locally actually changes',
          paragraphs: [
            'A cloud provider elsewhere in ClawAI’s catalog runs a model on its own infrastructure and charges per request; Ollama and llama.cpp instead load an open-weight model onto hardware you control, so the request never leaves it. That changes who can see the request, not what any given model is capable of.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Local-Only and Privacy-First routing modes',
          paragraphs: [
            'Local-Only routing keeps every request on hardware you control, using Ollama or llama.cpp rather than any cloud provider. Privacy-First routing is a separate mode with its own priorities; both exist because not every workload should default to Auto routing, and choosing between them is a deliberate decision rather than a default to leave unexamined.',
          ],
        },
        {
          id: 'when-private-deployment-fits',
          heading: 'When a private or local workload is the right shape',
          paragraphs: [
            'A private or local workload is defined by where the request runs, not by what kind of task it is — coding, writing or research can all be run this way if the requirement is that nothing leaves hardware you control. See choosing a model for private, local workloads and what is local-first AI, both linked below, for the trade-offs to weigh.',
          ],
        },
      ],
      faq: [
        {
          question: 'What is the difference between Local-Only and Privacy-First routing?',
          answer:
            'Local-Only keeps every request on hardware you control via Ollama or llama.cpp; Privacy-First is a separate routing mode with its own priorities. Both exist because not every workload should default to Auto routing.',
        },
        {
          question: 'Which open-weight model should I run locally?',
          answer:
            'This page does not recommend one — see what is local-first AI, linked below, for how to think about the choice, since the right model depends on your hardware and task.',
        },
        {
          question: 'Can I run any kind of task locally, or only certain ones?',
          answer:
            'A private or local workload is defined by where the request runs, not by the task — coding, writing, or research can all run this way if staying on hardware you control matters more than which task it is.',
        },
      ],
      productNote:
        'ClawAI’s Local-Only and Privacy-First routing modes keep a request on hardware you control via the Ollama and llama.cpp connectors — real, shipped connectors, not a roadmap item.',
    },
  },
};
