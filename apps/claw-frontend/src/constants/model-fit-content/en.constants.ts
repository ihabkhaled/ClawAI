import { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { ModelFitDictionary } from '@/types/model-fit.types';

export const EN_MODEL_FIT_CONTENT: ModelFitDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All tasks',
    ctaTitle: 'Try it rather than take our word for it',
    ctaBody:
      'ClawAI routes a conversation to the model that fits it, across every provider it connects to, from one workspace.',
    startFree: 'Start on the free plan',
    seeFeatures: 'See what ClawAI does',
    seePricing: 'Confirm the live catalog on the pricing page',
  },
  hub: {
    seo: {
      title: 'Choosing a model for your task',
      description:
        'What actually matters when you pick a model for coding, complex reasoning, writing, research with sources, or private and local workloads — no rankings, no invented benchmarks.',
      keywords: [
        'choosing a model for a task',
        'which AI model fits my task',
        'model for coding vs writing',
      ],
    },
    eyebrow: 'Model fit',
    title: 'Choosing a model for your task',
    summary:
      'There is no single best model — there is a model that fits a given task, and the fit changes with what the task needs: how deep the reasoning has to go, how much context it has to hold, how sensitive the cost is, and whether the request has to stay on hardware you control. This hub does not rank models; it walks through what to weigh for five common kinds of work, and links to the provider pages and evaluation guides that let you check for yourself.',
    topicsHeading: 'Pick a task',
    cardSummaries: {
      [ModelFitTask.CODING]: 'What matters when a model is writing or editing code.',
      [ModelFitTask.COMPLEX_REASONING]:
        'Multi-step problems where the model has to work through steps.',
      [ModelFitTask.WRITING_AND_EDITING]:
        'Long-form drafting, editing and following a style brief.',
      [ModelFitTask.RESEARCH_WITH_SOURCES]:
        'Answers grounded in sources the model looked up, not just training data.',
      [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]:
        'Keeping a request on hardware you control instead of a cloud provider.',
    },
  },
  tasks: {
    [ModelFitTask.CODING]: {
      seo: {
        title: 'Choosing a model for coding',
        description:
          'What to weigh when picking a model for coding tasks in ClawAI — instruction-following, context window, and cost per request. No rankings, no invented benchmarks. Confirm the live catalog before choosing a plan.',
        keywords: [
          'choosing a model for coding',
          'which model to use for coding',
          'AI model for programming',
        ],
      },
      eyebrow: 'Model fit',
      title: 'Choosing a model for coding',
      summary:
        'Coding work spans a wide range — a one-line fix, a multi-file refactor, a from-scratch feature — and the model that fits changes with the size and shape of that work. This page walks through what to weigh rather than naming a single winner; ClawAI’s router can already act on most of it, or you can choose manually.',
      sections: [
        {
          id: 'what-coding-needs',
          heading: 'What a coding task actually needs from a model',
          paragraphs: [
            'Coding tasks lean on a model’s ability to follow detailed, structured instructions and keep a change internally consistent across a file or several files — closer to careful step-by-step writing than to open-ended conversation. Several providers in ClawAI’s catalog publish models built specifically for working through a problem in steps rather than answering immediately, which is a reasonable fit for a non-trivial change; a simple, well-specified edit rarely needs that.',
          ],
        },
        {
          id: 'context-and-cost',
          heading: 'Context window and cost, not just capability',
          paragraphs: [
            'A large codebase, or a task that needs several files open at once, is a context-window problem before it is anything else — a model has to be able to hold the relevant code in view to reason about it correctly. Cost sensitivity also varies within one workflow: a high-volume task like generating boilerplate or simple completions is a reasonable place for a lower-cost model, while a careful refactor across a critical path is a reasonable place to spend more. Treating every coding request the same way, regardless of size, is usually the wrong default.',
          ],
        },
        {
          id: 'how-clawai-routes-coding',
          heading: 'How ClawAI can route a coding request',
          paragraphs: [
            'ClawAI’s router can send a coding request to a fitting model automatically under Auto or High Reasoning routing, or you can pin a specific one under Manual Model mode when you know exactly which model a task needs. Browse the model providers page to see every provider family ClawAI can route a request to, and confirm the live catalog on the pricing page before choosing a plan built around one model — availability and allowances are enforced there, not on this page.',
          ],
        },
      ],
      faq: [
        {
          question: 'Which model is best for coding?',
          answer:
            'This page will not name one — “best” depends on the size and shape of the task, and no trustworthy benchmark settles it for every case. See how to evaluate AI models, linked below, for a repeatable method you can apply to your own workload instead.',
        },
        {
          question: 'Does ClawAI pick a different model automatically for coding tasks?',
          answer:
            'Under Auto or High Reasoning routing, ClawAI’s router can send a request to a model it judges fits the task, coding included. You can also pin a specific model yourself under Manual Model mode.',
        },
        {
          question: 'Is a reasoning-focused model always the right choice for coding?',
          answer:
            'Not necessarily — a simple, well-specified change often does not need one, while a multi-step refactor is a more natural fit. Confirm the live catalog on the pricing page before choosing a plan around a specific model.',
        },
      ],
      productNote:
        'ClawAI can route a coding request to a fitting model automatically, or you can pin one directly under Manual Model mode — the choice is yours, not locked to a single vendor.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFitTask.COMPLEX_REASONING]: {
      seo: {
        title: 'Choosing a model for complex reasoning',
        description:
          'What to weigh when picking a model for multi-step reasoning tasks in ClawAI — reasoning depth, routing modes, and how to evaluate a model on your own problem. Confirm the live catalog before choosing a plan.',
        keywords: [
          'choosing a model for reasoning',
          'AI model for complex problems',
          'multi-step reasoning model',
        ],
      },
      eyebrow: 'Model fit',
      title: 'Choosing a model for complex reasoning',
      summary:
        'A complex reasoning task asks a model to work through several steps — breaking a problem down, checking intermediate results, revising before answering — rather than producing a first-pass response. This page walks through what that changes about model fit, without naming a single winner or citing a benchmark score.',
      sections: [
        {
          id: 'what-reasoning-tasks-need',
          heading: 'What a multi-step reasoning task needs',
          paragraphs: [
            'Several providers in ClawAI’s catalog publish models built specifically for working through a problem step by step before producing a final answer, rather than responding immediately — a reasonable starting point for a task with several dependent steps, several constraints to satisfy at once, or a result that needs checking before it is final. A short, single-step question rarely benefits from that shape of model; the fit is about the task’s structure, not a general notion of which model is stronger.',
          ],
        },
        {
          id: 'high-reasoning-routing',
          heading: 'ClawAI’s High Reasoning routing mode',
          paragraphs: [
            'High Reasoning is one of ClawAI’s seven routing modes, built for exactly this kind of request: the router favours a model suited to working through a problem in steps rather than answering immediately. Auto routing can also reach for one of these models when it judges a request calls for it; Manual Model mode lets you pin one directly if you already know which model a recurring task needs.',
          ],
        },
        {
          id: 'evaluating-reasoning-models',
          heading: 'Checking a model’s reasoning fit for yourself',
          paragraphs: [
            'No page on this site publishes a benchmark score, because a published number rarely reflects how a model performs on your specific problem — see how to read AI benchmarks, linked below, for what a published score does and does not tell you. How to evaluate AI models, also linked below, walks through a repeatable way to check a model against your own reasoning tasks instead.',
          ],
        },
      ],
      faq: [
        {
          question: 'Which model is best at reasoning?',
          answer:
            'This page does not name one — the models built for multi-step reasoning vary by provider, and how well one performs on your specific problem is worth checking yourself rather than taking from a published score. See how to evaluate AI models, linked below.',
        },
        {
          question: 'What does ClawAI’s High Reasoning routing mode do?',
          answer:
            'It is one of ClawAI’s seven routing modes; when selected, the router favours a model suited to working through a problem in steps rather than answering it immediately.',
        },
        {
          question: 'Should I always use a reasoning-focused model?',
          answer:
            'No — a short, single-step question rarely needs one, and reasoning-focused models sit at every cost band across ClawAI’s providers. Confirm the live catalog on the pricing page before choosing a plan around a specific model.',
        },
      ],
      productNote:
        'ClawAI’s High Reasoning routing mode can send a request to a model suited to working through a problem in steps, or you can pin one directly under Manual Model mode.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFitTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Choosing a model for writing and editing',
        description:
          'What to weigh when picking a model for drafting, editing and long-form writing in ClawAI — context window, following a style brief, and cost across a workflow. Confirm the live catalog before choosing a plan.',
        keywords: [
          'choosing a model for writing',
          'AI model for editing',
          'model for long-form drafting',
        ],
      },
      eyebrow: 'Model fit',
      title: 'Choosing a model for writing and editing',
      summary:
        'Writing and editing cover a wide range of tasks — a short rewrite, a long document edited for consistency, a full draft built to a style brief — and what a model needs to do well changes across that range. This page walks through what to weigh rather than naming a single model as the answer.',
      sections: [
        {
          id: 'what-writing-tasks-need',
          heading: 'What a writing or editing task needs from a model',
          paragraphs: [
            'Careful writing work leans on a model’s ability to follow detailed instructions and hold a consistent tone and structure across an entire piece, which is closer to what several providers describe their general-purpose and higher tiers as suited for. A short rewrite or a single paragraph rarely needs the same model as a long document that has to stay consistent from the first page to the last.',
          ],
        },
        {
          id: 'context-window-for-long-documents',
          heading: 'Context window matters for long documents',
          paragraphs: [
            'Editing a long document, or drafting one against a lengthy style brief and reference material, is a context-window problem before anything else — the model has to be able to hold the whole document, or enough of it, in view to keep terminology, tone and structure consistent. See what is a context window, linked below, for what that limit actually means and where it comes from.',
          ],
        },
        {
          id: 'how-clawai-routes-writing',
          heading: 'How ClawAI can route a writing request',
          paragraphs: [
            'ClawAI’s router can send a writing or editing request to a fitting model automatically under Auto or Cost Saver routing, or you can pin a specific one under Manual Model mode for a recurring task with a known style brief. Browse the model providers page to see every provider family ClawAI can route to, and confirm the live catalog on the pricing page before choosing a plan built around one model.',
          ],
        },
      ],
      faq: [
        {
          question: 'Which model writes best?',
          answer:
            'This page will not name one — writing quality is judged differently by every reader and task, and no benchmark settles it. See how to evaluate AI models, linked below, for a method that checks against your own material instead.',
        },
        {
          question: 'Which model should I use for a long document?',
          answer:
            'Look at context window size before anything else, since a long document has to fit in view for the model to stay consistent across it. See what is a context window, linked below, for how that limit works.',
        },
        {
          question: 'Can I keep the same model for a recurring writing task?',
          answer:
            'Yes — pin one under Manual Model mode if a recurring task has a known style brief and you want the same model every time, rather than leaving it to automatic routing.',
        },
      ],
      productNote:
        'ClawAI can route a writing request to a fitting model automatically, or you can pin one directly under Manual Model mode for a recurring task with a known style brief.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFitTask.RESEARCH_WITH_SOURCES]: {
      seo: {
        title: 'Choosing a model for research with sources',
        description:
          'How ClawAI’s Research mode grounds an answer in sources it looked up, how that is billed separately from model credit, and what still depends on the model you choose. Confirm the live catalog before choosing a plan.',
        keywords: [
          'AI research with sources',
          'grounded answers AI model',
          'choosing a model for research',
        ],
      },
      eyebrow: 'Model fit',
      title: 'Choosing a model for research with sources',
      summary:
        'A research task asks for an answer grounded in sources the model actually looked up, not only what it learned during training. ClawAI’s Research mode is a real, shipped feature built for this; this page explains what it does, what it is billed as, and what a model choice still changes once sources are involved.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'What ClawAI’s Research mode does',
          paragraphs: [
            'Research mode lets a request search the web, fetch a page, or fetch and extract structured content from one, before the model produces an answer — so the answer can cite sources it retrieved for that specific question rather than relying only on what the underlying model learned during training. It is a plan-gated feature with three depths: search only, search plus fetch, or search plus fetch and extract.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Research is billed separately, not from your model credit',
          paragraphs: [
            'Research access is metered as its own usage — web search, page fetches and extraction — separate from the token allowance a chat message draws on. A claim that “research uses your model credit” would be wrong: the two are tracked and billed as different things, and your plan’s research allowance is a separate line from its model token allowance.',
          ],
        },
        {
          id: 'what-the-model-still-changes',
          heading: 'What the underlying model still changes',
          paragraphs: [
            'Research mode changes what the model can see before it answers, not how well it reasons over what it retrieved — a model still has to read the fetched sources, weigh them against each other, and write an answer that reflects them accurately. The same considerations that apply to complex reasoning tasks apply here: a model built for working through several steps is a reasonable fit for reconciling several sources, and that is worth checking against your own material rather than assuming.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does research use my model credit?',
          answer:
            'No. Research access — web search, page fetches and extraction — is metered separately from the token allowance a chat message draws on. Confirm both allowances on the pricing page.',
        },
        {
          question: 'What is the difference between the three Research mode depths?',
          answer:
            'Search only returns results from a web search; search plus fetch also retrieves the page content; search plus fetch and extract additionally pulls structured content out of what it fetched. Which one a request uses depends on how it is configured.',
        },
        {
          question: 'Does the model I choose matter if Research mode is on?',
          answer:
            'Yes — Research mode changes what sources the model can see, not how well it reads and reconciles them. See how to evaluate AI models, linked below, for how to check that against your own workload.',
        },
      ],
      productNote:
        'ClawAI’s Research mode can search, fetch, and fetch-and-extract from the web before a model answers — a real, shipped feature, metered separately from your model token credit.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]: {
      seo: {
        title: 'Choosing a model for private, local workloads',
        description:
          'What changes when a request stays on hardware you control instead of a cloud provider, and how ClawAI’s Local-Only and Privacy-First routing modes fit private workloads. Confirm the live catalog before choosing a plan.',
        keywords: [
          'private AI model workloads',
          'local AI model choice',
          'run AI models on your own hardware',
        ],
      },
      eyebrow: 'Model fit',
      title: 'Choosing a model for private, local workloads',
      summary:
        'A private or local workload is defined by where the request runs, not by what kind of task it is — the requirement is that it stays on hardware you control instead of reaching a cloud provider. ClawAI has live adapters to Ollama and llama.cpp for exactly this, plus routing modes that keep a request local by default.',
      sections: [
        {
          id: 'what-changes-locally',
          heading: 'What running a model locally actually changes',
          paragraphs: [
            'A cloud provider elsewhere in ClawAI’s catalog runs a model on its own infrastructure and charges per request; Ollama and llama.cpp instead load an open-weight model onto hardware you control, so the request never leaves it. That changes who can see the request, not what any given model is capable of — see local AI, on the model providers page, for the full mechanism rather than repeating it here.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'ClawAI’s Local-Only and Privacy-First routing modes',
          paragraphs: [
            'Local-Only routing keeps every request on hardware you control, using Ollama or llama.cpp rather than any cloud provider. Privacy-First routing is a separate mode with its own priorities; both exist specifically because not every workload should default to Auto routing. Choosing between them, or pinning a specific local model under Manual Model mode, is a workload decision worth making deliberately rather than leaving to a general-purpose default.',
          ],
        },
        {
          id: 'choosing-which-open-weight-model',
          heading: 'Choosing which open-weight model to run',
          paragraphs: [
            'This page deliberately names no specific open-weight model, for the same reason the local AI provider page does not: the field moves faster than a static page can track, and a stale recommendation is worse than none. See what is local-first AI, linked below, for how to think about the trade-off between an open-weight model you run yourself and a cloud provider.',
          ],
        },
      ],
      faq: [
        {
          question: 'Which open-weight model should I run for a private workload?',
          answer:
            'This page does not recommend one — see what is local-first AI, linked below, for how to think about the choice, since the right model depends on your hardware and task in a way a static page cannot track responsibly.',
        },
        {
          question: 'What is the difference between Local-Only and Privacy-First routing?',
          answer:
            'Local-Only keeps every request on hardware you control via Ollama or llama.cpp; Privacy-First is a separate routing mode with its own priorities. Both exist because not every workload should default to Auto routing.',
        },
        {
          question: 'Does running a model locally cost anything through ClawAI?',
          answer:
            'ClawAI does not charge a per-token rate for a locally run model the way it does for a cloud provider, since there is no cloud provider being billed — the cost is the hardware you already run it on. Confirm current plan behaviour on the pricing page.',
        },
      ],
      productNote:
        'ClawAI’s Local-Only routing mode keeps every request on hardware you control via Ollama or llama.cpp — a real, shipped connector, not a roadmap item.',
      catalogDisclaimer:
        'No specific model is named here on purpose — open-weight models and their capabilities change quickly, and you choose which ones to run. Confirm plan behaviour for local workloads on the pricing page.',
    },
  },
};
