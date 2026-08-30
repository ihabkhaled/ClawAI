import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const EN_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'On this page',
    atAGlance: 'At a glance',
    tableCaption: 'How ClawAI and {rival} compare, capability by capability',
    capabilityColumn: 'Capability',
    clawColumn: 'ClawAI',
    strengthTitle: 'Where {rival} is strong',
    differenceTitle: 'Where ClawAI works differently',
    chooseTitle: 'Which one to choose',
    chooseRivalLabel: 'Choose {rival} if',
    chooseClawLabel: 'Choose ClawAI if',
    faqTitle: 'Questions people ask',
    lastReviewed: 'Compared on public information, last checked',
    independence:
      'ClawAI is an independent product. It is not affiliated with, endorsed by, or reselling on behalf of any assistant named on this page. Every claim is drawn from each vendor’s public documentation on the date above, and these products change quickly — check the vendor’s own pages before you decide.',
    otherComparisons: 'Compare ClawAI with another assistant',
    startFree: 'Start on the free plan',
    seePricing: 'See pricing',
  },
  hub: {
    eyebrow: 'Comparisons',
    intro:
      'ClawAI is not trying to be a better single assistant. It puts {cloudProviderCount} cloud providers and local open-weight models behind one subscription and sends each message to the one suited to it. These pages set that against the assistants people already use, on the same eight capabilities every time.',
    cardsTitle: 'Pick an assistant to compare',
    cardCta: 'Compare with {rival}',
    coversTitle: 'What every comparison covers',
    coversBody:
      'The same eight capabilities, in the same order, on every page: model choice, routing, side-by-side answers, local models, self-hosting, memory and files, workspace connectors, and per-answer usage receipts. Same questions for everyone, so two pages can be read next to each other.',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'Model choice',
    [ComparisonDimension.ROUTING]: 'Routing',
    [ComparisonDimension.SIDE_BY_SIDE]: 'Side-by-side answers',
    [ComparisonDimension.LOCAL_MODELS]: 'Local and open-weight models',
    [ComparisonDimension.SELF_HOSTING]: 'Self-hosting',
    [ComparisonDimension.MEMORY_AND_FILES]: 'Memory and files',
    [ComparisonDimension.CONNECTORS]: 'Workspace connectors',
    [ComparisonDimension.RECEIPTS]: 'Usage receipts',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]:
      '{cloudProviderCount} cloud providers, plus open-weight models on your own hardware',
    [ComparisonDimension.ROUTING]:
      '{routingModeCount} routing modes, including automatic per-message routing',
    [ComparisonDimension.SIDE_BY_SIDE]:
      'One prompt to several models at once, answers side by side',
    [ComparisonDimension.LOCAL_MODELS]:
      'Open-weight models on your own GPU, via Ollama or llama.cpp',
    [ComparisonDimension.SELF_HOSTING]: 'The whole stack runs on your servers, source on GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'Memory that persists between conversations, plus file context',
    [ComparisonDimension.CONNECTORS]: '{connectorCount} workspace connectors',
    [ComparisonDimension.RECEIPTS]:
      'Every answer records its model, its cost and the allowance it drew',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI vs ChatGPT',
      intro:
        'ChatGPT is the assistant most people mean when they say “AI” — polished, fast, and backed by OpenAI’s own frontier models. ClawAI is a different shape: one subscription that reaches OpenAI’s models alongside eight other families, and sends each message to whichever suits it.',
      theirStrength:
        'A single, extremely well-made product. Voice, image generation, code execution and deep research are built in and work together, the mobile apps are excellent, and the model underneath is a frontier model rather than a compromise.',
      ourDifference:
        'ClawAI does not try to be a better single assistant. It removes the single-vendor question: one conversation can move between OpenAI, Anthropic, Google and six other families, drop to a local open-weight model when the data cannot leave your network, and record which model answered.',
      chooseRival:
        'you want one polished assistant, OpenAI models cover nearly everything you do, and the built-in voice and image tooling matters to you.',
      chooseClaw:
        'you keep hitting the edge of one vendor, want a second model to check the first, or need some work to stay on your own hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'OpenAI models only',
        [ComparisonDimension.ROUTING]: 'Automatic selection within OpenAI’s own range',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud only',
        [ComparisonDimension.SELF_HOSTING]: 'Not offered',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Memory, projects and file uploads',
        [ComparisonDimension.CONNECTORS]: 'Apps and connectors on paid plans',
        [ComparisonDimension.RECEIPTS]: 'Plan-level usage, not per-answer cost',
      },
      faq: [
        {
          question: 'Can ClawAI use the same OpenAI models as ChatGPT?',
          answer:
            'ClawAI routes to OpenAI’s models as one of nine families in its roster. There is no OpenAI account to create and no API key to paste — model access comes with the subscription.',
        },
        {
          question: 'Is ClawAI a ChatGPT client?',
          answer:
            'No. ClawAI is an independent platform with its own routing, memory, comparison and orchestration layers. OpenAI is one provider it can send a message to, not the product underneath it.',
        },
        {
          question: 'Can I run ClawAI without sending anything to OpenAI?',
          answer:
            'Yes. Pin a conversation to a local open-weight model, or self-host the whole stack and run only models on your own GPUs, with no external provider calls at all.',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI vs Claude',
      intro:
        'Claude is what many people reach for when the work is long, careful and written. ClawAI reaches Anthropic’s models too — alongside eight other families — and lets a second model check what the first one said.',
      theirStrength:
        'Careful reasoning over long documents, the most reliable instruction-following in the field, and strong code review. Projects, artifacts and MCP connectors make it a genuinely good place to do sustained written work.',
      ourDifference:
        'ClawAI treats Anthropic as one strong option rather than the only one. The same thread can send a prompt to Claude and four other models at once, have one model judge another’s answer, and fall back automatically when a provider is down.',
      chooseRival:
        'nearly all your work is long-form reasoning or code review, and one excellent model is enough.',
      chooseClaw:
        'you want Claude’s answer and a second opinion, need a local model for sensitive work, or would rather not hold a separate subscription per vendor.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Anthropic models only',
        [ComparisonDimension.ROUTING]: 'You pick the model yourself',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud only',
        [ComparisonDimension.SELF_HOSTING]: 'Not offered',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Projects, files and memory',
        [ComparisonDimension.CONNECTORS]: 'MCP connectors and desktop extensions',
        [ComparisonDimension.RECEIPTS]: 'Plan-level usage, not per-answer cost',
      },
      faq: [
        {
          question: 'Does ClawAI include Claude models?',
          answer:
            'Yes. Anthropic is one of nine model families in the roster, reachable from any conversation without a separate Anthropic account or key.',
        },
        {
          question: 'Can one model check another model’s answer?',
          answer:
            'Yes. Verify, Judge and Critic put a second model on the first one’s output. That reduces the risk of a confident wrong answer without removing it — anything consequential still needs a human read.',
        },
        {
          question: 'Is ClawAI affiliated with Anthropic?',
          answer:
            'No. ClawAI is independent. It routes to Anthropic’s models the way it routes to eight other providers, and is neither endorsed by nor partnered with any of them.',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI vs Gemini',
      intro:
        'Gemini is the assistant closest to the documents you already have, provided those documents live in Google Workspace. ClawAI comes at it from the other side: provider-neutral, with Google’s models as one of nine families.',
      theirStrength:
        'Very large context windows, native handling of images, audio and video, fast responses, and an integration with Gmail, Drive and Docs that no third party can match.',
      ourDifference:
        'ClawAI is not tied to one office suite or one vendor’s roadmap. It connects to twelve workspace tools rather than one, routes each message by task, and can keep sensitive work on a local open-weight model.',
      chooseRival:
        'your organisation lives in Google Workspace and you want the assistant sitting directly inside it.',
      chooseClaw:
        'you use tools from several vendors, want to compare models before committing, or need a deployment that makes no external provider calls.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Google models only',
        [ComparisonDimension.ROUTING]: 'Automatic selection within Google’s own range',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Google-hosted only',
        [ComparisonDimension.SELF_HOSTING]: 'Not offered',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Files, Drive and Workspace context',
        [ComparisonDimension.CONNECTORS]: 'Deep Google Workspace integration',
        [ComparisonDimension.RECEIPTS]: 'Plan-level usage, not per-answer cost',
      },
      faq: [
        {
          question: 'Can ClawAI use Gemini models?',
          answer:
            'Yes. Google is one of the nine model families in the roster, available in any conversation under the same subscription.',
        },
        {
          question: 'Does ClawAI connect to Google Workspace?',
          answer:
            'ClawAI ships twelve workspace connectors covering issue trackers, chat and documents. Its Google integration is a connector rather than a first-party surface — broader across vendors, shallower inside Google.',
        },
        {
          question: 'Which is better for very long documents?',
          answer:
            'Both handle them well, and Google’s largest context windows are among the biggest available. ClawAI’s difference is that you can send the same long document to two models and compare what each concluded.',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI vs Perplexity',
      intro:
        'Perplexity is built around one job: answering a question from the live web, with sources attached. ClawAI is built around a different one: getting the right model onto whatever work you are doing, research included.',
      theirStrength:
        'The best-shaped product for search-style questions. Answers arrive with citations, follow-ups keep the thread coherent, and the whole interface is designed around checking where a claim came from.',
      ourDifference:
        'ClawAI is a workspace rather than an answer engine. Research is one mode among many, sitting next to model comparison, persistent memory, file context, a coding agent and local models — and every answer records the model that produced it.',
      chooseRival: 'most of your questions are “what is true right now, and who says so”.',
      chooseClaw:
        'research is only part of the work and you also need code, long-form drafting, model comparison, or a model that runs on your own hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Several vendors’ models on higher plans',
        [ComparisonDimension.ROUTING]: 'Chosen for search and answer quality',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud only',
        [ComparisonDimension.SELF_HOSTING]: 'Not offered',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Spaces, threads and file uploads',
        [ComparisonDimension.CONNECTORS]: 'Connectors on business plans',
        [ComparisonDimension.RECEIPTS]: 'Plan-level usage, not per-answer cost',
      },
      faq: [
        {
          question: 'Does ClawAI search the web?',
          answer:
            'Yes. Research runs a multi-step web search and returns an answer with its sources. It is one capability inside the workspace rather than the whole product.',
        },
        {
          question: 'Which gives better citations?',
          answer:
            'Perplexity is purpose-built for cited answers and shows sources for effectively every claim. ClawAI cites its research runs; for a pure find-and-cite question, a dedicated answer engine is the sharper tool.',
        },
        {
          question: 'Can I use both?',
          answer:
            'Many people do. The comparison worth making is whether you want a specialist answer engine, a general multi-model workspace, or both.',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI vs Microsoft Copilot',
      intro:
        'Copilot is Microsoft 365 with an assistant threaded through it. ClawAI is a standalone workspace that reaches nine model families and can run entirely on your own servers.',
      theirStrength:
        'Nothing else sits as close to an organisation’s existing Microsoft data. Word, Excel, Outlook and Teams context arrives without configuration, and licensing, tenancy and compliance follow the Microsoft 365 agreement IT already has.',
      ourDifference:
        'ClawAI is vendor-neutral and deployable anywhere. It routes across nine model families instead of one supplier’s selection, shows what each answer cost, and can be installed inside your own network with open-weight models and no external calls.',
      chooseRival:
        'your organisation runs on Microsoft 365 and the value is the assistant being inside the documents already there.',
      chooseClaw:
        'you want provider choice, per-answer cost visibility, or a deployment that never leaves your own infrastructure.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'OpenAI models plus Microsoft’s own',
        [ComparisonDimension.ROUTING]: 'Chosen by Microsoft per surface',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud only',
        [ComparisonDimension.SELF_HOSTING]: 'Not offered',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Microsoft 365 files and organisation context',
        [ComparisonDimension.CONNECTORS]: 'Deepest Microsoft 365 integration',
        [ComparisonDimension.RECEIPTS]: 'Per-seat licensing, not per-answer cost',
      },
      faq: [
        {
          question: 'Can ClawAI be deployed inside our own network?',
          answer:
            'Yes. The whole stack runs on your servers with open-weight models on your own GPUs and no external provider calls. It is a scoped engagement rather than a plan you buy online.',
        },
        {
          question: 'Does ClawAI integrate with Microsoft 365?',
          answer:
            'ClawAI ships twelve workspace connectors covering issue trackers, chat and documents — broader across vendors than Copilot, and shallower inside Microsoft’s own applications.',
        },
        {
          question: 'How is usage billed?',
          answer:
            'By cost-normalized tokens against a daily and monthly allowance, not per seat. Every answer shows the model, the cost and the allowance it drew.',
        },
      ],
    },
    [ComparisonRival.KIMI]: {
      name: 'Kimi',
      vendor: 'Moonshot AI',
      eyebrow: 'ClawAI vs Kimi',
      intro:
        'Kimi built its reputation on very long context and, more recently, on releasing open weights that anyone can download and run. ClawAI is a different shape: one subscription that reaches Kimi-class open-weight models alongside eight other families, and sends each message to whichever suits it.',
      theirStrength:
        'Long-context reading at a price that undercuts most Western frontier models, strong agentic and tool-use behaviour, and open weights for the flagship line — so the same model can be evaluated in the hosted product and then run on your own hardware.',
      ourDifference:
        'ClawAI does not ask you to pick a lab. An open-weight model can answer the questions where cost or residency matters, a frontier model can take the ones that need it, and the routing decision is recorded per answer instead of being a habit you have to remember.',
      chooseRival:
        'your work is dominated by very long documents, you are comfortable with a single vendor, and the price per token is the number that decides it.',
      chooseClaw:
        'you want open-weight economics on some messages and frontier quality on others, without running two subscriptions and deciding by hand each time.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Moonshot models only',
        [ComparisonDimension.ROUTING]: 'Selection within Moonshot’s own range',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Open weights published, hosting is your own problem',
        [ComparisonDimension.SELF_HOSTING]: 'Weights yes, product no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Long-context file reading',
        [ComparisonDimension.CONNECTORS]: 'Limited outside its own apps',
        [ComparisonDimension.RECEIPTS]: 'API-level usage, not per-answer cost',
      },
      faq: [
        {
          question: 'Can ClawAI use Kimi models?',
          answer:
            'ClawAI reaches open-weight models of this class through its own roster, and can run them locally on your GPUs. There is no separate account to create and no API key to paste.',
        },
        {
          question: 'Is running open weights myself cheaper than a subscription?',
          answer:
            'At sustained volume it can be, once you own the GPUs and the operational time. ClawAI is aimed at the case in between: open-weight economics for the messages that suit them, frontier models for the ones that do not, on one bill.',
        },
        {
          question: 'Does my data leave the network if I use a local model?',
          answer:
            'No. Pin a conversation to a local open-weight model and nothing is sent to an external provider. Self-hosting the whole stack removes external calls entirely.',
        },
      ],
    },
    [ComparisonRival.QWEN]: {
      name: 'Qwen',
      vendor: 'Alibaba',
      eyebrow: 'ClawAI vs Qwen',
      intro:
        'Qwen is one of the most complete open-weight families available: a wide ladder of sizes, strong multilingual coverage, and permissive licensing on most of the range. ClawAI puts models of that class next to eight other families under one subscription.',
      theirStrength:
        'Breadth. Sizes from ones that run on a laptop to ones that need a server, vision and coding variants, genuinely good performance outside English, and licensing that makes commercial self-hosting straightforward.',
      ourDifference:
        'ClawAI is the layer above the model rather than the model itself. It routes per message, can ask several families the same question and show the answers side by side, keeps memory and files across all of them, and prices the whole thing as one allowance.',
      chooseRival:
        'you are building on top of a model, want to own the deployment, and have the operational capacity to run and update it yourself.',
      chooseClaw:
        'you want to use models rather than operate them, and want the option to reach a frontier model when an open-weight one is not enough.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Qwen family only',
        [ComparisonDimension.ROUTING]: 'You pick the size and variant',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Not part of the model',
        [ComparisonDimension.LOCAL_MODELS]: 'Open weights across the range',
        [ComparisonDimension.SELF_HOSTING]: 'Weights yes, product no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Whatever you build around it',
        [ComparisonDimension.CONNECTORS]: 'Whatever you build around it',
        [ComparisonDimension.RECEIPTS]: 'Your own instrumentation',
      },
      faq: [
        {
          question: 'Can I run an open-weight model inside ClawAI?',
          answer:
            'Yes. ClawAI runs open-weight models locally through its own runtime, and a conversation can be pinned to one so nothing leaves your network.',
        },
        {
          question: 'Why use ClawAI instead of hosting a model directly?',
          answer:
            'Because the model is the easy part. Routing, comparison, memory, file handling, connectors, quotas and per-answer cost accounting are the parts you would otherwise build, and they are what ClawAI is.',
        },
        {
          question: 'Does ClawAI support languages other than English?',
          answer:
            'The product interface ships in thirteen languages, and model choice is per message — so a multilingual model can take the messages that need one.',
        },
      ],
    },
    [ComparisonRival.GLM]: {
      name: 'GLM',
      vendor: 'Zhipu AI',
      eyebrow: 'ClawAI vs GLM',
      intro:
        'GLM is Zhipu’s frontier line, known for strong coding and agentic performance at a fraction of the price of the largest Western models, with open weights on much of the range. ClawAI treats models of that class as one option among nine.',
      theirStrength:
        'Price-to-capability. Coding and tool-use results close to far more expensive models, an aggressive release cadence, and open weights that make self-hosting a real option rather than a press release.',
      ourDifference:
        'ClawAI does not make you bet on one lab keeping its lead. Routing is per message and the roster changes underneath you, so a cheaper model taking more of the work is a configuration change rather than a migration.',
      chooseRival:
        'cost per capable answer is the deciding number, your work is mostly code, and you are willing to follow one lab’s release cycle closely.',
      chooseClaw:
        'you want that economics available without committing to it for everything, and want a record of which model actually answered.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Zhipu models only',
        [ComparisonDimension.ROUTING]: 'Selection within Zhipu’s own range',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Open weights on much of the range',
        [ComparisonDimension.SELF_HOSTING]: 'Weights yes, product no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'File uploads in its own app',
        [ComparisonDimension.CONNECTORS]: 'Limited outside its own apps',
        [ComparisonDimension.RECEIPTS]: 'API-level usage, not per-answer cost',
      },
      faq: [
        {
          question: 'Is ClawAI cheaper than using a low-cost model directly?',
          answer:
            'Per token, no — a direct API call to the cheapest capable model is always the floor. ClawAI is cheaper than the realistic alternative: several subscriptions, or building routing, memory and cost accounting yourself.',
        },
        {
          question: 'Can I make ClawAI prefer lower-cost models?',
          answer:
            'Yes. Routing modes range from fully automatic to pinning a specific model, and the cost-aware modes weigh price against capability per message.',
        },
        {
          question: 'How do I know which model answered?',
          answer:
            'Every answer carries the provider, the model, the routing mode and the cost it drew, and the routing decision itself can be inspected.',
        },
      ],
    },
    [ComparisonRival.DEEPSEEK]: {
      name: 'DeepSeek',
      vendor: 'DeepSeek',
      eyebrow: 'ClawAI vs DeepSeek',
      intro:
        'DeepSeek changed the price expectation for reasoning models and published open weights for its flagship line. ClawAI is the layer that lets a model like that take the work it is good at without becoming the only model you have.',
      theirStrength:
        'Reasoning and mathematics at a price that upended the market, open weights on the flagship line, and a research posture that publishes rather than hints — you can read how the models were trained.',
      ourDifference:
        'ClawAI keeps the choice open per message. A reasoning-heavy question can go to a reasoning model, a routine one to something cheap and fast, and a sensitive one to a model on your own hardware, with the decision recorded rather than assumed.',
      chooseRival:
        'your workload is dominated by hard reasoning, you want the lowest price for it, and one vendor is acceptable.',
      chooseClaw:
        'reasoning is part of your work rather than all of it, and you want a second model available to check the first.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'DeepSeek models only',
        [ComparisonDimension.ROUTING]: 'You pick chat or reasoning',
        [ComparisonDimension.SIDE_BY_SIDE]: 'One answer at a time',
        [ComparisonDimension.LOCAL_MODELS]: 'Open weights on the flagship line',
        [ComparisonDimension.SELF_HOSTING]: 'Weights yes, product no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'File uploads in its own app',
        [ComparisonDimension.CONNECTORS]: 'Limited outside its own apps',
        [ComparisonDimension.RECEIPTS]: 'API-level usage, not per-answer cost',
      },
      faq: [
        {
          question: 'Can ClawAI route only to reasoning models?',
          answer:
            'Yes. A conversation can be pinned to a specific model, and the automatic mode already sends reasoning-heavy messages to models suited to them.',
        },
        {
          question: 'Where is my data processed?',
          answer:
            'Whichever provider answered, and the answer says which. If that matters for a piece of work, pin it to a local open-weight model, or self-host the stack so nothing leaves your network.',
        },
        {
          question: 'Can I compare two models on the same question?',
          answer:
            'Yes. Compare mode sends one prompt to several models at once and shows the answers side by side, with an optional judge pass to score them.',
        },
      ],
    },
  },
};
