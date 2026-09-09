import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const EN_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All pairs',
    ctaTitle: 'Try it rather than take our word for it',
    ctaBody:
      'ClawAI routes a conversation to the model that fits it, across every provider it connects to, from one workspace.',
    startFree: 'Start on the free plan',
    seeFeatures: 'See what ClawAI does',
    seePricing: 'Confirm the live catalog on the pricing page',
  },
  hub: {
    seo: {
      title: 'How ClawAI routes between model families',
      description:
        'How ClawAI’s own router chooses between two provider families for a given request — cost class, context needs, and whether a request should stay local. No rankings between named products, no invented benchmarks.',
      keywords: [
        'how ClawAI routes between model providers',
        'choosing between AI model families',
        'OpenAI vs Anthropic vs Google routing',
      ],
    },
    eyebrow: 'Model routing',
    title: 'How ClawAI routes between model families',
    summary:
      'This hub does not rank OpenAI, Anthropic, Google, DeepSeek or xAI against each other — that is a different question from the one ClawAI’s router actually answers. What the router does is choose, for a given request, which family it sends that request to, weighing cost class, how much context the request needs, whether the workload has to stay on hardware you control, and which routing mode you have selected. Each page below explains that choice for one pair of families, grounded in ClawAI’s own routing modes and the qualitative cost bands in its model catalog, never in a benchmark score.',
    pairsHeading: 'Pick a pair',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        'How the router weighs a request between OpenAI’s and Anthropic’s catalogs.',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]:
        'How the router weighs a request between OpenAI’s and Google’s catalogs.',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        'How the router weighs a request between Anthropic’s and Google’s catalogs.',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        'How cost class shifts the router’s choice between OpenAI and DeepSeek.',
      [ModelFamilyPair.OPENAI_VS_XAI]:
        'How the router weighs a request between OpenAI’s and xAI’s catalogs.',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        'What changes when a request has to stay on hardware you control instead of any cloud provider.',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI vs Anthropic: how ClawAI routes between them',
        description:
          'How ClawAI’s router chooses between OpenAI’s and Anthropic’s model catalogs for a given request — cost class, reasoning-mode fit, and manual pinning. No winner declared. Confirm the live catalog before choosing a plan.',
        keywords: [
          'OpenAI vs Anthropic',
          'ClawAI router OpenAI Anthropic',
          'choosing between OpenAI and Claude models',
        ],
      },
      eyebrow: 'Model routing',
      title: 'OpenAI vs Anthropic: how ClawAI routes between them',
      summary:
        'OpenAI and Anthropic both publish catalogs that span several cost classes, from cheap, fast-to-answer models to premium and ultra tiers built for harder problems. This page does not rank one family above the other — it explains what ClawAI’s router actually weighs when a request could plausibly go to either, and how you can override that choice yourself.',
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading: 'Cost class spans both catalogs, not one tier per vendor',
          paragraphs: [
            'ClawAI’s model catalog tags every seeded model with a qualitative cost class — budget, standard, premium, or highest — rather than an exact price. OpenAI’s catalog spans budget through premium; Anthropic’s spans standard through the highest tier. Neither vendor owns the cheap end or the expensive end outright, so a router decision based on cost has to look at the specific models available in both catalogs, not assume one vendor is uniformly cheaper.',
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: 'The routing modes that touch this pair',
          paragraphs: [
            'Under Auto routing, ClawAI’s router can send a request to a model from either catalog based on what the request needs. High Reasoning routing favours a model built for working through a problem in steps, and both OpenAI and Anthropic publish models in that shape; Cost Saver routing favours a lower cost-class model, which again exists in both catalogs. Manual Model mode lets you pin a specific model from either vendor directly, which is the deliberate override for a recurring task where you already know which one fits.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'What this page does not claim',
          paragraphs: [
            'No page on this site publishes a benchmark score or a speed claim comparing these two vendors, and this one does not start. See how to read AI benchmarks and how to evaluate AI models, linked below, for how to check a fit against your own workload instead of taking a ranking from anywhere, including this page.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is OpenAI or Anthropic better?',
          answer:
            'This page will not say — both publish models across several cost classes and use cases, and no trustworthy benchmark settles it for every task. See how to evaluate AI models, linked below, for a method you can apply to your own workload.',
        },
        {
          question: 'Does ClawAI’s router pick between OpenAI and Anthropic automatically?',
          answer:
            'Under Auto, High Reasoning, or Cost Saver routing, yes — the router can send a request to a model from either catalog based on what the request needs. You can also pin a specific model from either vendor under Manual Model mode.',
        },
        {
          question: 'Can I use both OpenAI and Anthropic models in the same workspace?',
          answer:
            'Yes — ClawAI connects to both as separate providers, and Auto routing can draw on either one depending on the request, or you can pin a specific model from each for different tasks under Manual Model mode.',
        },
      ],
      productNote:
        'ClawAI’s Auto and High Reasoning routing can draw on either OpenAI’s or Anthropic’s catalog for a given request, or you can pin one directly under Manual Model mode.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI vs Google: how ClawAI routes between them',
        description:
          'How ClawAI’s router chooses between OpenAI’s and Google’s model catalogs for a given request — cost class, context needs, and manual pinning. No winner declared. Confirm the live catalog before choosing a plan.',
        keywords: [
          'OpenAI vs Google Gemini',
          'ClawAI router OpenAI Google',
          'choosing between OpenAI and Gemini models',
        ],
      },
      eyebrow: 'Model routing',
      title: 'OpenAI vs Google: how ClawAI routes between them',
      summary:
        'OpenAI and Google Gemini both publish catalogs spanning cheap, fast-to-answer models through premium tiers. This page does not name a winner — it explains what ClawAI’s router weighs when a request could plausibly go to either family, and how to override that choice.',
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: 'Cost class and catalog shape',
          paragraphs: [
            'OpenAI’s seeded catalog spans budget through premium; Google’s Gemini catalog spans budget through premium as well, with a cheap tier of its own. A router decision weighing cost class has to look at the specific model within each family that fits a request’s budget, since both vendors publish a range rather than a single fixed price point.',
          ],
        },
        {
          id: 'context-window-considerations',
          heading: 'Context window is a per-model property, not a per-vendor one',
          paragraphs: [
            'How much a model can hold in view at once varies by the specific model chosen, not by which of these two vendors it comes from. See what is a context window, linked below, for what that limit means and why a request that needs to reason over a large document or a long conversation history should check it directly rather than assume either vendor’s models are uniformly larger.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'How ClawAI routes a request between them',
          paragraphs: [
            'Under Auto routing, ClawAI’s router can send a request to a fitting model from either catalog. Cost Saver routing favours a lower cost-class model regardless of which of these two vendors it comes from. Manual Model mode lets you pin a specific OpenAI or Google model directly for a recurring task with a known fit.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is OpenAI or Google Gemini better?',
          answer:
            'This page does not say — both publish models across several cost classes, and fit depends on the task. See how to evaluate AI models, linked below, for a repeatable way to check against your own workload.',
        },
        {
          question: 'Does ClawAI route automatically between OpenAI and Google models?',
          answer:
            'Under Auto or Cost Saver routing, the router can send a request to a fitting model from either catalog. You can also pin a specific model from either vendor under Manual Model mode.',
        },
        {
          question: 'Which vendor has the larger context window?',
          answer:
            'That varies by the specific model, not uniformly by vendor. See what is a context window, linked below, for how to check a given model’s limit before relying on it for a large document or long conversation.',
        },
      ],
      productNote:
        'ClawAI’s Auto and Cost Saver routing can draw on either OpenAI’s or Google’s catalog for a given request, or you can pin one directly under Manual Model mode.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic vs Google: how ClawAI routes between them',
        description:
          'How ClawAI’s router chooses between Anthropic’s and Google’s model catalogs for a given request — cost class, reasoning-mode fit, and manual pinning. No winner declared. Confirm the live catalog before choosing a plan.',
        keywords: [
          'Anthropic vs Google Gemini',
          'ClawAI router Anthropic Google',
          'choosing between Claude and Gemini models',
        ],
      },
      eyebrow: 'Model routing',
      title: 'Anthropic vs Google: how ClawAI routes between them',
      summary:
        'Anthropic’s catalog runs standard through the highest cost tier; Google’s Gemini catalog spans budget through premium. This page explains what that difference in shape means for how ClawAI’s router chooses between them — not which one is better.',
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: 'The two catalogs cover different parts of the cost range',
          paragraphs: [
            'Anthropic’s seeded models sit in the standard, premium and highest cost classes, with no budget-tier entry today; Google’s Gemini catalog reaches down to a budget tier. That shape difference, not a capability judgement, is one input a cost-aware routing decision weighs when a request has a tight budget versus one where cost matters less.',
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: 'Both catalogs include reasoning-focused models',
          paragraphs: [
            'Both Anthropic and Google publish at least one model in their catalog aimed at working through a problem in steps rather than answering immediately. ClawAI’s High Reasoning routing mode can favour a fitting model from either family for that kind of request; which specific one it reaches for depends on availability and the request’s other needs, not a fixed preference for one vendor.',
          ],
        },
        {
          id: 'overriding-the-router',
          heading: 'Overriding the router yourself',
          paragraphs: [
            'Manual Model mode lets you pin a specific Anthropic or Google model directly, which is the right choice for a recurring task where you already know which one fits — a documented workflow, a known style, a specific integration — rather than leaving it to automatic routing every time.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is Anthropic or Google Gemini better?',
          answer:
            'This page does not name one — the two catalogs cover different parts of the cost range and both include reasoning-focused models. See how to evaluate AI models, linked below, for how to check fit against your own workload.',
        },
        {
          question: 'Does ClawAI’s High Reasoning mode favour one of these vendors?',
          answer:
            'No fixed preference — High Reasoning routing can favour a fitting model from either catalog depending on availability and the request’s needs.',
        },
        {
          question: 'Can I pin a Claude or Gemini model for a specific recurring task?',
          answer:
            'Yes — Manual Model mode lets you pin a specific model from either vendor directly, which is a reasonable choice once you know a task’s fit rather than relying on automatic routing every time.',
        },
      ],
      productNote:
        'ClawAI’s High Reasoning routing can favour a fitting model from either Anthropic’s or Google’s catalog, or you can pin one directly under Manual Model mode.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI vs DeepSeek: how ClawAI routes between them',
        description:
          'How cost class shifts ClawAI’s router between OpenAI’s and DeepSeek’s catalogs, and how Cost Saver routing and Manual Model mode fit this pair. No winner declared. Confirm the live catalog before choosing a plan.',
        keywords: [
          'OpenAI vs DeepSeek',
          'ClawAI router OpenAI DeepSeek',
          'cheaper AI model alternative to OpenAI',
        ],
      },
      eyebrow: 'Model routing',
      title: 'OpenAI vs DeepSeek: how ClawAI routes between them',
      summary:
        'OpenAI’s catalog spans budget through premium; DeepSeek’s seeded models sit in the standard cost class. This page walks through what that cost-class difference means for routing a request between the two, without declaring either the better vendor.',
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading: 'Cost class is the clearest difference between these two catalogs',
          paragraphs: [
            'DeepSeek’s two seeded models — a general chat model and a reasoning-focused model — both sit in ClawAI’s standard cost class. OpenAI’s catalog spans a wider range, from a budget tier up through premium. For a cost-sensitive request, that makes DeepSeek’s catalog a reasonable place to start, though OpenAI’s own budget-tier models sit in the same cost class and are worth weighing too — the comparison is between cost classes, not between vendors as a whole.',
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'ClawAI’s Cost Saver routing mode',
          paragraphs: [
            'Cost Saver is one of ClawAI’s seven routing modes, built to favour a lower cost-class model when a request does not need a premium one. It can reach into either catalog depending on which model actually fits the request at that cost class, rather than defaulting to one vendor by name.',
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: 'A reasoning-focused option exists in both catalogs',
          paragraphs: [
            'DeepSeek publishes a model built specifically for working through a problem in steps, in the same standard cost class as its general chat model; OpenAI publishes reasoning-focused models across its standard and premium tiers. High Reasoning routing can reach either, and which one fits a specific multi-step task is worth checking directly rather than assuming from cost class alone.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is DeepSeek a cheaper alternative to OpenAI?',
          answer:
            'DeepSeek’s seeded models sit in ClawAI’s standard cost class, and OpenAI also publishes budget and standard-tier models — so the fair comparison is by cost class, not by vendor. Confirm current pricing for any specific model on the pricing page.',
        },
        {
          question: 'Does ClawAI’s Cost Saver mode prefer DeepSeek?',
          answer:
            'No fixed preference — Cost Saver routing favours whichever available model fits a lower cost class for the request, from either catalog.',
        },
        {
          question: 'Does DeepSeek have a reasoning-focused model like OpenAI’s?',
          answer:
            'Yes — DeepSeek publishes a model built for working through a problem in steps, in the same cost class as its general chat model. OpenAI publishes reasoning-focused models too, across a wider cost range.',
        },
      ],
      productNote:
        'ClawAI’s Cost Saver routing can favour a lower cost-class model from either OpenAI’s or DeepSeek’s catalog, or you can pin one directly under Manual Model mode.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI vs xAI: how ClawAI routes between them',
        description:
          'How ClawAI’s router chooses between OpenAI’s and xAI’s Grok catalogs for a given request — cost class and manual pinning. No winner declared. Confirm the live catalog before choosing a plan.',
        keywords: [
          'OpenAI vs xAI Grok',
          'ClawAI router OpenAI xAI',
          'choosing between GPT and Grok models',
        ],
      },
      eyebrow: 'Model routing',
      title: 'OpenAI vs xAI: how ClawAI routes between them',
      summary:
        'OpenAI’s catalog spans budget through premium; xAI’s Grok catalog in ClawAI spans budget through premium as well, with fewer seeded models overall. This page explains what ClawAI’s router weighs between the two, without naming either the better vendor.',
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: 'A smaller catalog does not mean a narrower cost range',
          paragraphs: [
            'xAI’s seeded catalog in ClawAI is smaller than OpenAI’s — two models against OpenAI’s six — but still spans a budget-tier and a premium-tier model, the same cost-class range OpenAI’s own catalog covers at its extremes. A router decision between them weighs the specific model’s cost class against the request’s budget, not the size of either vendor’s catalog.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'How ClawAI routes a request between them',
          paragraphs: [
            'Under Auto routing, ClawAI’s router can send a request to a fitting model from either catalog. Cost Saver routing favours the lower cost-class option regardless of vendor. Manual Model mode lets you pin a specific OpenAI or xAI model directly if you already know which one a task needs.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'What this page does not claim',
          paragraphs: [
            'This page makes no speed claim and no capability ranking between these two vendors — no page on this site does. See how to evaluate AI models, linked below, for a method to check fit against your own workload instead.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is OpenAI or xAI Grok better?',
          answer:
            'This page does not say — both publish models across a similar cost-class range, and no trustworthy benchmark settles fit for every task. See how to evaluate AI models, linked below.',
        },
        {
          question: 'Does ClawAI route automatically between OpenAI and xAI models?',
          answer:
            'Under Auto or Cost Saver routing, yes — the router can send a request to a fitting model from either catalog. You can also pin a specific model from either vendor under Manual Model mode.',
        },
        {
          question: 'Does xAI have as many models in ClawAI’s catalog as OpenAI?',
          answer:
            'No — xAI’s seeded catalog is smaller, two models against OpenAI’s six, though it still spans a similar cost-class range. Confirm the live catalog on the pricing page.',
        },
      ],
      productNote:
        'ClawAI’s Auto and Cost Saver routing can draw on either OpenAI’s or xAI’s catalog for a given request, or you can pin one directly under Manual Model mode.',
      catalogDisclaimer:
        'Model availability and allowances are enforced by your plan and the live catalog, not by this page. Confirm the live catalog on the pricing page before choosing a plan built around a specific model.',
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: 'Cloud vs local: how ClawAI routes between them',
        description:
          'What changes when a request stays on hardware you control instead of a cloud provider, and how ClawAI’s Local-Only and Privacy-First routing modes fit that choice. No winner declared. Confirm the live catalog before choosing a plan.',
        keywords: [
          'cloud AI vs local AI',
          'ClawAI Local-Only routing',
          'when to run a model locally instead of the cloud',
        ],
      },
      eyebrow: 'Model routing',
      title: 'Cloud vs local: how ClawAI routes between them',
      summary:
        'This is the one pair in this cluster defined by where a request runs, not by which vendor answers it. Every cloud family ClawAI connects to — OpenAI, Anthropic, Google, DeepSeek, xAI — runs a model on its own infrastructure; Ollama and llama.cpp instead run an open-weight model on hardware you control. This page explains what that changes and how ClawAI’s router treats the choice, given ClawAI’s own local-first design.',
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: 'What actually changes when a request stays local',
          paragraphs: [
            'A cloud provider runs a model on its own infrastructure and charges per request; Ollama and llama.cpp instead load an open-weight model onto hardware you control, so the request never reaches a cloud provider at all. That changes who can see the request, not what any specific model is capable of — see local AI, on the model providers page, for the full mechanism.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'ClawAI’s Local-Only and Privacy-First routing modes exist for this choice',
          paragraphs: [
            'Local-Only routing keeps every request on hardware you control via Ollama or llama.cpp, never reaching any of the five cloud families this cluster covers. Privacy-First routing is a separate mode with its own priorities. Both exist specifically because not every workload should default to Auto routing, which can reach any connected provider, cloud or local, depending on the request.',
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: 'When a workload is a candidate for staying local',
          paragraphs: [
            'A request is a reasonable candidate for Local-Only or Privacy-First routing when the requirement is that it never leaves hardware you control — a compliance boundary, a client confidentiality requirement, or simply a preference not to send certain data to any outside vendor. See what is local-first AI, linked below, for how to think about the trade-off between an open-weight model you run yourself and a cloud provider’s catalog.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is a local model as capable as a cloud model?',
          answer:
            'This page does not rank them — capability depends on the specific open-weight model you choose to run, which is your decision, not a fixed comparison this page can make responsibly. See what is local-first AI, linked below.',
        },
        {
          question: 'How does ClawAI decide whether to keep a request local?',
          answer:
            'It does not decide for you by default — Local-Only routing keeps every request on hardware you control, and Privacy-First routing applies its own priorities; Auto routing can reach any connected provider, cloud or local. You choose which mode a workspace or request uses.',
        },
        {
          question: 'Does running a model locally cost anything through ClawAI?',
          answer:
            'ClawAI does not charge a per-token rate for a locally run model the way it does for a cloud provider, since no cloud provider is being billed — the cost is the hardware you already run it on. Confirm current plan behaviour on the pricing page.',
        },
      ],
      productNote:
        'ClawAI’s Local-Only routing mode keeps every request on hardware you control via Ollama or llama.cpp — a real, shipped connector, not a roadmap item — alongside Privacy-First routing for a separate set of priorities.',
      catalogDisclaimer:
        'No specific cloud or local model is ranked here on purpose — open-weight models and every cloud catalog change on their own schedule, and you choose which to run or connect. Confirm plan behaviour for local workloads on the pricing page.',
    },
  },
};
