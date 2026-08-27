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
      'ClawAI is not trying to be a better single assistant. It puts nine frontier model families behind one subscription and sends each message to the one suited to it. These pages set that against the assistants people already use, on the same eight capabilities every time.',
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
    [ComparisonDimension.MODEL_CHOICE]: 'Nine frontier model families under one subscription',
    [ComparisonDimension.ROUTING]: 'Five routing modes, including automatic per-message routing',
    [ComparisonDimension.SIDE_BY_SIDE]:
      'One prompt to several models at once, answers side by side',
    [ComparisonDimension.LOCAL_MODELS]:
      'Open-weight models on your own GPU, via Ollama or llama.cpp',
    [ComparisonDimension.SELF_HOSTING]: 'The whole stack runs on your servers, source on GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'Memory that persists between conversations, plus file context',
    [ComparisonDimension.CONNECTORS]: 'Twelve workspace connectors',
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
  },
};
