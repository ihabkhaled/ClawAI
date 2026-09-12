import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const EN_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All providers',
    ctaTitle: 'Try it rather than take our word for it',
    ctaBody:
      'ClawAI routes a conversation to the model that fits it, across every provider below, from one workspace.',
    startFree: 'Start on the free plan',
    seeFeatures: 'See what ClawAI does',
    catalogHeading: 'Models ClawAI can route to',
    seePricing: 'Confirm the live catalog on the pricing page',
    catalogLiveNote:
      'This list is read live from the models ClawAI can route to right now, so it changes as providers are connected or models are retired.',
    catalogUnavailable:
      'The live model catalog is temporarily unavailable. Please try again shortly.',
    catalogMore: 'and {count} more models available on this provider',
    contextWindowLabel: 'Context',
    capabilityLabels: {
      vision: 'Vision',
      tools: 'Tools',
      audio: 'Audio',
    },
  },
  hub: {
    seo: {
      title: 'AI model providers ClawAI connects to',
      description:
        'Every model provider ClawAI can route a conversation to — OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, and local, open-weight models — with qualitative cost bands and no invented benchmarks.',
      keywords: [
        'AI model providers',
        'which AI models does ClawAI support',
        'compare AI providers',
      ],
    },
    eyebrow: 'Model providers',
    title: 'The model providers behind ClawAI',
    summary:
      'ClawAI does not build a model — it routes your conversation to one, chosen from several providers by task, cost or privacy. This page names the provider families with a live adapter today, what each is generally known for, and a qualitative cost band. It does not rank them, and it is not a substitute for checking the live catalog before you commit to a plan.',
    topicsHeading: 'Pick a provider',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5, o3 and the rest of OpenAI’s current lineup.',
      [ModelProviderPage.ANTHROPIC]: 'The Claude Opus, Sonnet and Haiku family.',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro, Flash and Flash-Lite.',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek Chat and DeepSeek Reasoner.',
      [ModelProviderPage.XAI]: 'Grok 4 and Grok 3 mini from xAI.',
      [ModelProviderPage.LOCAL_AI]:
        'Open-weight models you run yourself, with Ollama or llama.cpp.',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'OpenAI models in ClawAI — GPT-5, o3, and more',
        description:
          'The OpenAI models ClawAI can route a conversation to, what each is built for, and a qualitative cost band. Confirm the live catalog before choosing a plan.',
        keywords: ['OpenAI models ClawAI', 'GPT-5 in ClawAI', 'which OpenAI model to use'],
      },
      eyebrow: 'Model provider',
      title: 'OpenAI',
      summary:
        'ClawAI has a live adapter to OpenAI, so a conversation can be routed to one of several OpenAI models depending on the task, its cost band, and your routing mode. This page names the models ClawAI can reach today; it is not a substitute for the live catalog on the pricing page.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'What OpenAI’s lineup covers',
          paragraphs: [
            'OpenAI’s current lineup spans a flagship reasoning-and-general-purpose tier (GPT-5), a lighter and faster sibling (GPT-5 mini), a multimodal generalist (GPT-4o and GPT-4o mini), and two models built specifically for step-by-step reasoning tasks (o3 and o4-mini). ClawAI’s router can pick between them per request rather than committing your whole account to one.',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: 'When a task suits an OpenAI model',
          paragraphs: [
            'OpenAI models are a reasonable default for general-purpose writing, coding assistance and everyday question-answering, and the o-series models are built specifically for multi-step reasoning problems where the model is expected to work through a problem rather than answer immediately. Which one actually performs best on your task is something to verify yourself — see how to evaluate AI models below — rather than take from marketing copy, including this page.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'How ClawAI routes to it',
          paragraphs: [
            'ClawAI’s router can send a request to an OpenAI model automatically under Auto or Cost Saver routing, or you can pin a specific one under Manual Model mode. Cost bands below are qualitative — cheaper models cost meaningfully less per request, but the exact rate moves with OpenAI’s own pricing, not with anything ClawAI controls.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does ClawAI have a direct partnership with OpenAI?',
          answer:
            'No. ClawAI connects to OpenAI’s public API the same way any application with an API key would. There is no special arrangement implied by this page.',
        },
        {
          question: 'Which OpenAI model should I use for coding?',
          answer:
            'That depends on the task and the workspace you’re in — see how to evaluate AI models, linked below, for a method rather than a single recommendation. This page intentionally does not claim one model is best.',
        },
        {
          question: 'Is GPT-5 always available on my plan?',
          answer:
            'Model availability is enforced by your plan and the live catalog, not by this page. Confirm the current lineup on the pricing page before choosing a plan for a specific model.',
        },
      ],
      productNote:
        'ClawAI can route a request to an OpenAI model automatically, or you can pin one directly — the choice is yours, not locked to a single vendor.',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'Anthropic Claude models in ClawAI',
        description:
          'The Claude models ClawAI can route a conversation to — Opus, Sonnet and Haiku — what each is built for, and a qualitative cost band. Confirm the live catalog before choosing a plan.',
        keywords: ['Claude models ClawAI', 'Anthropic in ClawAI', 'Claude Opus vs Sonnet vs Haiku'],
      },
      eyebrow: 'Model provider',
      title: 'Anthropic',
      summary:
        'ClawAI has a live adapter to Anthropic, so a conversation can be routed to a Claude model depending on the task, its cost band, and your routing mode. This page names the models ClawAI can reach today; it is not a substitute for the live catalog on the pricing page.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'What the Claude lineup covers',
          paragraphs: [
            'Anthropic’s current lineup has three tiers: Claude Opus 4 at the top, built for the hardest and most involved tasks; Claude Sonnet 4 as the general-purpose middle tier; and Claude Haiku 4.5 as the fast, lower-cost option for simpler requests. ClawAI’s router can move between them per request.',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: 'When a task suits a Claude model',
          paragraphs: [
            'Claude models are commonly used for long-document work, careful step-by-step writing, and coding assistance where following detailed instructions matters. As with any provider, the right model for a specific task is something worth verifying against your own workload — see how to read AI benchmarks below for what a published number does and does not tell you.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'How ClawAI routes to it',
          paragraphs: [
            'ClawAI’s router can send a request to a Claude model automatically under Auto, High Reasoning or Cost Saver routing, or you can pin one under Manual Model mode. Anthropic is the only provider in this list that publishes a separate cache-write rate, which is a billing detail rather than a capability difference — it does not change what the model can do.',
          ],
        },
      ],
      faq: [
        {
          question: 'What is the difference between Opus, Sonnet and Haiku?',
          answer:
            'They are three cost and capability tiers of the same model family — Opus is the highest tier, Sonnet the mid tier, Haiku the fastest and lowest-cost tier. ClawAI’s router can pick between them, or you can choose manually.',
        },
        {
          question: 'Does ClawAI have a direct partnership with Anthropic?',
          answer:
            'No. ClawAI connects to Anthropic’s public API the same way any application with an API key would.',
        },
        {
          question: 'Is Claude Opus 4 available on every plan?',
          answer:
            'Model availability is enforced by your plan and the live catalog, not by this page. Confirm the current lineup on the pricing page before choosing a plan for a specific model.',
        },
      ],
      productNote:
        'ClawAI can route a request to a Claude model automatically, or you can pin one directly — the choice is yours, not locked to a single vendor.',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'Google Gemini models in ClawAI',
        description:
          'The Gemini models ClawAI can route a conversation to — 2.5 Pro, Flash and Flash-Lite — what each is built for, and a qualitative cost band. Confirm the live catalog before choosing a plan.',
        keywords: ['Gemini models ClawAI', 'Google AI in ClawAI', 'Gemini Pro vs Flash'],
      },
      eyebrow: 'Model provider',
      title: 'Google Gemini',
      summary:
        'ClawAI has a live adapter to Google Gemini, so a conversation can be routed to a Gemini model depending on the task, its cost band, and your routing mode. This page names the models ClawAI can reach today; it is not a substitute for the live catalog on the pricing page.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'What the Gemini lineup covers',
          paragraphs: [
            'Google’s current lineup has three tiers: Gemini 2.5 Pro for the most demanding requests, Gemini 2.5 Flash as the general-purpose middle tier, and Gemini 2.5 Flash-Lite as the fast, lower-cost option. ClawAI’s router can move between them per request.',
          ],
        },
        {
          id: 'when-google-fits',
          heading: 'When a task suits a Gemini model',
          paragraphs: [
            'Gemini models are commonly reached for for tasks with a large amount of source material to work through, since the family is built around long-context handling. Whether a given tier is the right fit for your specific workload is worth checking yourself — see how to evaluate AI models below for a repeatable method rather than a one-line claim.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'How ClawAI routes to it',
          paragraphs: [
            'ClawAI’s router can send a request to a Gemini model automatically under Auto or Cost Saver routing, or you can pin one under Manual Model mode. Gemini’s published pricing rises above a long-context threshold that this page’s cost band does not attempt to model — a single qualitative band is not precise enough to express a tiered rate, so treat it as a starting point, not a bill.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does ClawAI have a direct partnership with Google?',
          answer:
            'No. ClawAI connects to the Gemini API the same way any application with an API key would.',
        },
        {
          question: 'Which Gemini model handles long documents best?',
          answer:
            'The family is generally built for long-context handling across the tiers; the exact limit and cost depend on the specific model and request. Check the live catalog rather than assume a fixed number.',
        },
        {
          question: 'Is Gemini 2.5 Pro available on every plan?',
          answer:
            'Model availability is enforced by your plan and the live catalog, not by this page. Confirm the current lineup on the pricing page before choosing a plan for a specific model.',
        },
      ],
      productNote:
        'ClawAI can route a request to a Gemini model automatically, or you can pin one directly — the choice is yours, not locked to a single vendor.',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'DeepSeek models in ClawAI',
        description:
          'The DeepSeek models ClawAI can route a conversation to — DeepSeek Chat and DeepSeek Reasoner — what each is built for, and a qualitative cost band. Confirm the live catalog before choosing a plan.',
        keywords: ['DeepSeek models ClawAI', 'DeepSeek in ClawAI', 'DeepSeek Chat vs Reasoner'],
      },
      eyebrow: 'Model provider',
      title: 'DeepSeek',
      summary:
        'ClawAI has a live adapter to DeepSeek, so a conversation can be routed to a DeepSeek model depending on the task, its cost band, and your routing mode. This page names the models ClawAI can reach today; it is not a substitute for the live catalog on the pricing page.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'What the DeepSeek lineup covers',
          paragraphs: [
            'DeepSeek’s current lineup has two models: DeepSeek Chat, a general-purpose model, and DeepSeek Reasoner, built specifically for tasks where the model is expected to work through several steps before answering. Both are priced well below several other providers on this page, which is part of why a Cost Saver routing mode reaches for DeepSeek more often.',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: 'When a task suits a DeepSeek model',
          paragraphs: [
            'DeepSeek is a reasonable option when cost per request matters more than squeezing out the last increment of capability, and DeepSeek Reasoner specifically for multi-step reasoning tasks. As with any provider, verify against your own workload rather than a general claim — see how to read AI benchmarks below.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'How ClawAI routes to it',
          paragraphs: [
            'ClawAI’s router can send a request to a DeepSeek model automatically under Cost Saver or Auto routing, or you can pin one under Manual Model mode. Both DeepSeek models fall in the standard cost band on this page — genuinely inexpensive relative to premium tiers elsewhere on this site, without this page claiming an exact rate.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is DeepSeek cheaper than other providers?',
          answer:
            'Both DeepSeek models sit in the standard cost band here, generally lower than premium-tier models from other providers — but exact pricing moves with DeepSeek’s own published rates, not with this page.',
        },
        {
          question: 'What is DeepSeek Reasoner for?',
          answer:
            'It is built for tasks where the model works through several steps before producing an answer, similar in intent to the reasoning-focused models other providers publish.',
        },
        {
          question: 'Does ClawAI have a direct partnership with DeepSeek?',
          answer:
            'No. ClawAI connects to DeepSeek’s public API the same way any application with an API key would.',
        },
      ],
      productNote:
        'ClawAI can route a request to a DeepSeek model automatically, or you can pin one directly — the choice is yours, not locked to a single vendor.',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'xAI Grok models in ClawAI',
        description:
          'The xAI Grok models ClawAI can route a conversation to — Grok 4 and Grok 3 mini — what each is built for, and a qualitative cost band. Confirm the live catalog before choosing a plan.',
        keywords: ['Grok models ClawAI', 'xAI in ClawAI', 'Grok 4 in ClawAI'],
      },
      eyebrow: 'Model provider',
      title: 'xAI',
      summary:
        'ClawAI has a live adapter to xAI, so a conversation can be routed to a Grok model depending on the task, its cost band, and your routing mode. This page names the models ClawAI can reach today; it is not a substitute for the live catalog on the pricing page.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'What the Grok lineup covers',
          paragraphs: [
            'xAI’s current lineup has two models available through ClawAI: Grok 4, the higher-capability tier, and Grok 3 mini, a faster and lower-cost option. ClawAI’s router can move between them per request.',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: 'When a task suits a Grok model',
          paragraphs: [
            'Grok models are a reasonable general-purpose option alongside the other providers on this page. Which one performs best on a specific task is worth checking yourself — see how to evaluate AI models below for a method that does not rely on a single vendor’s marketing.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'How ClawAI routes to it',
          paragraphs: [
            'ClawAI’s router can send a request to a Grok model automatically under Auto or Cost Saver routing, or you can pin one under Manual Model mode. Grok 3 mini sits in the budget cost band on this page; Grok 4 sits in the premium band.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does ClawAI have a direct partnership with xAI?',
          answer:
            'No. ClawAI connects to xAI’s public API the same way any application with an API key would.',
        },
        {
          question: 'What is the difference between Grok 4 and Grok 3 mini?',
          answer:
            'They are a higher-capability tier and a faster, lower-cost tier of the same model family. ClawAI’s router can pick between them, or you can choose manually.',
        },
        {
          question: 'Is Grok 4 available on every plan?',
          answer:
            'Model availability is enforced by your plan and the live catalog, not by this page. Confirm the current lineup on the pricing page before choosing a plan for a specific model.',
        },
      ],
      productNote:
        'ClawAI can route a request to a Grok model automatically, or you can pin one directly — the choice is yours, not locked to a single vendor.',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'Local, open-weight AI models in ClawAI',
        description:
          'Run open-weight models yourself with Ollama or llama.cpp through ClawAI, instead of sending requests to a cloud provider. What the mechanism is and how it differs from the cloud providers on this page.',
        keywords: ['local AI models ClawAI', 'Ollama in ClawAI', 'run AI models locally'],
      },
      eyebrow: 'Model provider',
      title: 'Local AI',
      summary:
        'ClawAI has live adapters to Ollama and llama.cpp, two ways of running an open-weight model on hardware you control instead of sending a request to a cloud provider. Unlike the other pages in this cluster, there is no fixed catalog to name — the models are open-weight and you choose which ones to run.',
      sections: [
        {
          id: 'what-changes',
          heading: 'What running a model locally actually changes',
          paragraphs: [
            'A cloud provider on this site runs a model on its own infrastructure and charges per request. Ollama and llama.cpp instead load an open-weight model onto hardware you control — your own machine, or a server you operate — so the request never leaves it. That changes who can see the request, not what the model is capable of; a locally run open-weight model is a different kind of thing from any of the cloud providers listed elsewhere in this cluster, not a drop-in replacement for one.',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollama and llama.cpp are two different tools',
          paragraphs: [
            'Both are real ClawAI adapters, but they suit different situations — Ollama focuses on ease of pulling and running a model with sensible defaults, and llama.cpp gives more direct control over how a model is run at the cost of more manual setup. The full comparison lives at Ollama vs llama.cpp, linked below, rather than being repeated here.',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: 'Choosing which open-weight model to run',
          paragraphs: [
            'This page deliberately names no specific open-weight model, because the field moves faster than a static page can track and a stale recommendation is worse than none. What is local-first AI, linked below, explains open-weight models and the trade-off against cloud providers in more depth than a product page should.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does local AI cost anything through ClawAI?',
          answer:
            'ClawAI does not charge a per-token rate for a locally run model the way it does for a cloud provider, since there is no cloud provider being billed — the cost is the hardware you already run it on. Confirm current plan behaviour on the pricing page.',
        },
        {
          question: 'Which open-weight model should I run?',
          answer:
            'This page does not recommend one — see what is local-first AI, linked below, for how to think about the choice, since the right model depends on your hardware and task in a way a static page cannot track responsibly.',
        },
        {
          question: 'Is a locally run model as capable as a cloud model?',
          answer:
            'That depends entirely on the specific open-weight model and your hardware, and this page will not make a blanket claim either way. See how to evaluate AI models, linked below, for how to check for your own workload.',
        },
      ],
      productNote:
        'ClawAI’s Ollama and llama.cpp adapters are real, shipped connectors — Local-Only routing mode keeps every request on hardware you control.',
    },
  },
};
