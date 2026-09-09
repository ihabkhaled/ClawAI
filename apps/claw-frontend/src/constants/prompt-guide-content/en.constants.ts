import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PromptGuideDictionary } from '@/types/prompt-guide.types';

export const EN_PROMPT_GUIDE_CONTENT: PromptGuideDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All prompt guides',
    ctaTitle: 'Practice on a real conversation',
    ctaBody:
      'ClawAI gives you one workspace to try a prompt against models from every provider it connects to, so you can see what changes for yourself.',
    startFree: 'Start on the free plan',
    seeFeatures: 'See what ClawAI does',
  },
  hub: {
    seo: {
      title: 'How to write better AI prompts',
      description:
        'Practical, honest guides to writing prompts that get better results — clarity, examples, step-by-step reasoning, structured output, system prompts, and fixing a bad answer. No invented statistics, no overselling what a prompt can fix.',
      keywords: ['how to write AI prompts', 'prompt writing guide', 'prompt engineering basics'],
    },
    eyebrow: 'Prompt guides',
    title: 'How to write better AI prompts',
    summary:
      'A prompt is the instruction you give a model, and how you write it changes the answer you get — this is true whichever model or product you use. These guides walk through the techniques that actually help: being specific, giving examples, asking for step-by-step reasoning, describing the output format you want, and fixing an answer that missed the mark. None of them make a model correct or guarantee a result; they make it more likely you get what you meant to ask for.',
    topicsHeading: 'Pick a guide',
    cardSummaries: {
      [PromptGuideTopic.WRITING_CLEAR_PROMPTS]:
        'The fundamentals: context, constraints, format, and examples.',
      [PromptGuideTopic.FEW_SHOT_PROMPTING]: 'Showing a model what you want by giving it examples.',
      [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]:
        'Asking a model to work through steps before it answers.',
      [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]:
        'Writing the prompt that asks for JSON, a table, or another fixed shape.',
      [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]:
        'What a system prompt does differently from what you type in chat.',
      [PromptGuideTopic.ITERATING_ON_A_PROMPT]:
        'What to change when the first answer is not right.',
      [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]:
        'How the right approach shifts between code, writing, and analysis.',
    },
  },
  topics: {
    [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: {
      seo: {
        title: 'How to write a clear, specific AI prompt',
        description:
          'The fundamentals of a prompt that gets a useful answer: giving context, stating constraints, naming the format you want, and adding an example. Practical guidance, no invented statistics.',
        keywords: [
          'how to write a clear prompt',
          'AI prompt fundamentals',
          'specific prompt writing',
        ],
      },
      eyebrow: 'Prompt guides',
      title: 'How to write a clear, specific AI prompt',
      summary:
        'Most disappointing answers trace back to a prompt that left out something the model had no way to guess — the audience, the constraints, the format, or what "good" looks like. This guide walks through the four things worth adding before you send a prompt, in roughly the order they matter.',
      sections: [
        {
          id: 'give-context',
          heading: 'Give the model the context it cannot guess',
          paragraphs: [
            'A model answers from what is in the conversation plus what it learned during training — it does not know who you are writing for, what you already tried, or why the task matters, unless you say so. "Rewrite this email" and "rewrite this email so a customer who is already frustrated reads it as an apology, not an excuse" are the same task with a different amount of context, and they get different answers. Context does not need to be long; it needs to include the one or two facts that would change how a person would do the task.',
          ],
        },
        {
          id: 'state-constraints',
          heading: 'State the constraints instead of hoping they are implied',
          paragraphs: [
            'A length limit, a reading level, a tone, a thing to avoid mentioning, a deadline the answer has to respect — a model applies a constraint if you state it, and otherwise falls back to a generic default that may not fit. "Keep it under 150 words" and "avoid technical jargon" are both constraints a model can follow reliably once they are explicit; neither is something it infers correctly on its own with any consistency.',
          ],
        },
        {
          id: 'name-the-format',
          heading: 'Name the output format you actually want',
          paragraphs: [
            'A bulleted list, a short paragraph, a table, a subject line plus a body — asking for the shape you want up front saves a follow-up message asking for a reformat. This matters more, not less, once the output has to be parsed by something other than a person reading it; for that case, see prompting for structured output, linked below, which is the deeper companion guide to this point.',
          ],
        },
        {
          id: 'add-an-example',
          heading: 'Add an example when a description alone would be ambiguous',
          paragraphs: [
            'Some things are easier to show than describe — a house style, a tone, a specific format for a recurring task. One well-chosen example often resolves an ambiguity that several sentences of description would not. See few-shot prompting, linked below, for how to use more than one example deliberately, and when it is worth the extra length in the prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does a longer prompt always get a better answer?',
          answer:
            'No — a longer prompt only helps if the extra length is context, a constraint, or an example the model would otherwise be missing. Padding a prompt with restated instructions or filler does not improve the answer and can bury the part that mattered.',
        },
        {
          question: 'Will a clear prompt stop a model from getting facts wrong?',
          answer:
            'No. A clear prompt makes it more likely the model understands what you are asking for, but it does not verify facts, and it can still state something false with full confidence — see why AI hallucinates, linked below, for what actually causes that and why prompting alone cannot fix it.',
        },
        {
          question: 'What is the single most useful thing to add to a vague prompt?',
          answer:
            'Usually context: the one or two facts about the audience, the goal, or the situation that a person would need to do the task well. A constraint or an example helps too, but they matter less if the model still does not know who the answer is for.',
        },
      ],
      productNote:
        'ClawAI does not rewrite your prompt for you, but a clearer prompt goes further with any model you route to — including through Auto routing, which still answers from what you actually asked.',
    },
    [PromptGuideTopic.FEW_SHOT_PROMPTING]: {
      seo: {
        title: 'Few-shot prompting: giving a model examples',
        description:
          'How to use one or more examples in a prompt to show a model the pattern you want, rather than only describing it — with guidance on how many examples help and when zero-shot is enough.',
        keywords: ['few-shot prompting', 'prompt examples', 'one-shot vs few-shot prompting'],
      },
      eyebrow: 'Prompt guides',
      title: 'Few-shot prompting: giving a model examples',
      summary:
        'Few-shot prompting means including one or more worked examples in the prompt itself, so the model can follow the pattern rather than infer it from a description alone. It is one of the more reliable ways to narrow down what "good" means for a task that is easier to show than to explain.',
      sections: [
        {
          id: 'what-few-shot-means',
          heading: 'What "few-shot" and "zero-shot" mean',
          paragraphs: [
            'A zero-shot prompt asks for a result with no example included; a one-shot prompt includes exactly one; a few-shot prompt includes several. The terms describe how many examples are in the prompt, not a claim about accuracy — a well-written zero-shot prompt can outperform a badly chosen few-shot one, since the examples only help if they actually represent what you want.',
          ],
        },
        {
          id: 'when-examples-help-most',
          heading: 'When examples help more than a longer description would',
          paragraphs: [
            'Examples earn their place when the task has a format, tone, or pattern that is genuinely easier to demonstrate than describe — labeling data into categories that are hard to define in words, matching a specific writing voice, or following a template with quirks a plain description would miss. For a task that is already unambiguous from a short instruction, an example adds length without adding information.',
          ],
        },
        {
          id: 'choosing-good-examples',
          heading: 'What makes an example useful, not just present',
          paragraphs: [
            'An example is only as good as how representative it is of the real task — an easy or unusual example can teach the wrong pattern. A couple of well-chosen examples that cover the range of cases you actually expect, including an edge case if one is likely, tends to work better than several examples that all look alike. If your examples disagree with each other in tone or format, expect the model to blend them rather than pick the one you meant.',
          ],
        },
      ],
      faq: [
        {
          question: 'How many examples should a few-shot prompt include?',
          answer:
            'There is no fixed number — enough to cover the range of cases you expect, often two to five, and more only if the task genuinely varies more than that. Adding examples that all look the same rarely helps past the first one or two.',
        },
        {
          question: 'Is few-shot prompting always better than zero-shot?',
          answer:
            'No. It is not published as a guaranteed accuracy gain and this page will not claim one — a clear zero-shot prompt on a well-defined task can do just as well, and examples mainly help when the task is easier to show than to describe.',
        },
        {
          question: 'Can I combine few-shot examples with a step-by-step instruction?',
          answer:
            'Yes — they address different things. Examples show the pattern or format you want; asking for step-by-step reasoning changes how the model works toward the answer. See chain-of-thought prompting, linked below, for the second technique.',
        },
      ],
      productNote:
        'A few-shot prompt works the same way across every model ClawAI routes to — the examples live in your prompt, not in a setting, so they travel with the conversation regardless of which provider answers it.',
    },
    [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]: {
      seo: {
        title: 'Chain-of-thought prompting: asking a model to reason step by step',
        description:
          'What chain-of-thought prompting is, when asking a model to work through steps before answering actually helps, and why the result can still be wrong even after the reasoning looks methodical.',
        keywords: [
          'chain-of-thought prompting',
          'step-by-step prompting',
          'AI reasoning prompt technique',
        ],
      },
      eyebrow: 'Prompt guides',
      title: 'Chain-of-thought prompting: asking a model to reason step by step',
      summary:
        'Chain-of-thought prompting asks a model to work through a problem in steps — breaking it down, checking intermediate results — before giving a final answer, instead of producing a first-pass response immediately. It is a real, useful technique for the right kind of task, and on its own it does not make the final answer trustworthy without checking.',
      sections: [
        {
          id: 'what-it-is',
          heading: 'What asking for step-by-step reasoning actually does',
          paragraphs: [
            'A prompt like "work through this step by step" or "show your reasoning before giving a final answer" asks the model to lay out intermediate steps rather than jump straight to a conclusion. For a multi-step problem, this can surface a mistake in an intermediate step that would otherwise be buried inside a single, confident-sounding final answer — and it gives you something concrete to check rather than only a result to trust.',
          ],
        },
        {
          id: 'when-it-helps',
          heading: 'When it helps, and when it is unnecessary',
          paragraphs: [
            'Step-by-step prompting tends to help most on problems with several dependent steps, several constraints to satisfy at once, or a calculation worth double-checking — a multi-part word problem, a decision with several factors, a piece of logic that has to hold together. A short, single-step question rarely benefits from it, and asking for it anyway just adds length without changing the answer. See choosing a model for complex reasoning, linked below, for how this connects to picking a model built for exactly this kind of task.',
          ],
        },
        {
          id: 'what-it-does-not-guarantee',
          heading: 'What it does not guarantee',
          paragraphs: [
            'Asking a model to reason step by step does not make the answer correct, and a confident, well-structured chain of steps can still reach the wrong conclusion — the extra steps make an error easier to spot, not impossible to make. This is consistent with why AI hallucinates, linked below: a model can produce fluent, plausible-looking reasoning that is still wrong, so a step-by-step answer is worth checking on anything that matters, not taken on faith because it looks methodical.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does chain-of-thought prompting make the answer correct?',
          answer:
            'No — it does not make the reasoning correct, and a step-by-step answer can still reach a wrong conclusion. It tends to make a mistake easier to spot in the intermediate steps, which is different from preventing the mistake.',
        },
        {
          question: 'When should I ask a model to show its reasoning?',
          answer:
            'On problems with several dependent steps or constraints, where an intermediate mistake would otherwise be hidden inside a single final answer. A short, single-step question rarely needs it.',
        },
        {
          question: 'Is this the same as using a reasoning-focused model?',
          answer:
            'Related but not identical — this guide is about how you phrase a prompt to any model; choosing a model for complex reasoning, linked below, is about which model is built to work through steps by default. The two can be combined.',
        },
      ],
      productNote:
        'ClawAI’s High Reasoning routing mode favours a model suited to working through a problem in steps, which pairs naturally with a step-by-step prompt — but the technique on this page works with any model you route to.',
    },
    [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]: {
      seo: {
        title: 'How to write a prompt that asks for structured output',
        description:
          'Practical guidance for writing a prompt that reliably asks for JSON, a table, or another fixed format — the companion piece to what structured AI outputs are and why prompting alone does not guarantee valid structure.',
        keywords: [
          'prompt for JSON output',
          'structured output prompting',
          'how to ask AI for a table',
        ],
      },
      eyebrow: 'Prompt guides',
      title: 'How to write a prompt that asks for structured output',
      summary:
        'This guide is the practical, "how to write the prompt" companion to what are structured AI outputs, linked below, which covers the technical mechanism — this page assumes you already want structured output and focuses on how to ask for it well. It does not re-explain the underlying mechanism and stays consistent with what that page already says about what a plain prompt can and cannot guarantee.',
      sections: [
        {
          id: 'describe-the-shape-exactly',
          heading: 'Describe the exact shape you want, not just the format name',
          paragraphs: [
            'Saying "return this as JSON" is a start, but naming the fields, their order, and their types is what actually removes ambiguity — "return a JSON object with a string field called title and an array field called steps, where each step is a string" leaves far less for the model to guess than "return JSON with the title and the steps." The same applies to a table: name the columns and what belongs in each one rather than assuming the model will pick the same breakdown you have in mind.',
          ],
        },
        {
          id: 'show-an-example-of-the-shape',
          heading: 'Show one example of the exact output you want',
          paragraphs: [
            'A single example of the finished shape — a short sample JSON object, or one row of the table — often removes more ambiguity than another paragraph of description would, for the same reason an example helps in few-shot prompting, linked below. This matters most when the format has a quirk that is easy to describe imprecisely, like whether a field is optional or how a missing value should be represented.',
          ],
        },
        {
          id: 'plain-prompting-has-limits',
          heading: 'What a well-written prompt does not guarantee here',
          paragraphs: [
            'A carefully written prompt makes valid, well-shaped output more likely, but it does not guarantee it — a model can still return malformed JSON, an extra field, or prose wrapped around the structure you asked for, especially on a longer or more complex response. See what are structured AI outputs, linked below, for the technical mechanisms — like schema-constrained generation — that exist specifically because prompting alone is not a reliable guarantee, and for what ClawAI does differently from asking nicely in a prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is asking nicely in a prompt enough to guarantee valid JSON?',
          answer:
            'No — a well-written prompt makes it more likely, not certain. See what are structured AI outputs, linked below, for the mechanisms that exist because prompting alone does not reliably guarantee valid structure.',
        },
        {
          question: 'Should I describe the format or show an example?',
          answer:
            'Both, when the format has any ambiguity — a precise description of the fields plus one example of the finished shape covers more cases than either alone. See few-shot prompting, linked below, for how to choose a good example.',
        },
        {
          question: 'What is the difference between this guide and what are structured AI outputs?',
          answer:
            'That page explains the technical mechanism behind reliable structured output; this page is the practical companion — how to write the prompt itself. They are meant to be read together, not as duplicates of each other.',
        },
      ],
      productNote:
        'For output that has to be reliably valid, ClawAI’s structured-output mechanisms (see what are structured AI outputs, linked below) go further than prompt wording alone — this guide covers the prompt-writing half of that picture.',
    },
    [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]: {
      seo: {
        title: 'System prompts vs user prompts: what each one does',
        description:
          'The difference between a system prompt and the messages you type in a conversation — what each is for, when to use which, and how they work together.',
        keywords: [
          'system prompt vs user prompt',
          'what is a system prompt',
          'AI prompt roles explained',
        ],
      },
      eyebrow: 'Prompt guides',
      title: 'System prompts vs user prompts: what each one does',
      summary:
        'A conversation with a model is usually built from more than one kind of message: a system prompt that sets standing instructions for the whole conversation, and user prompts — what you actually type — that ask for something specific within it. Knowing which one to use for a given instruction saves repeating yourself and keeps a long conversation more consistent.',
      sections: [
        {
          id: 'what-a-system-prompt-is-for',
          heading: 'What a system prompt is for',
          paragraphs: [
            'A system prompt sets an instruction that applies to the whole conversation rather than one message in it — a persona to hold, a tone to keep, a rule to always follow ("always answer in formal English" or "never suggest a specific dosage"). It is set once, typically before the conversation starts, and a model treats it as standing guidance rather than something to negotiate with each new message.',
          ],
        },
        {
          id: 'what-a-user-prompt-is-for',
          heading: 'What a user prompt is for',
          paragraphs: [
            'A user prompt is what you type at each turn of the conversation — the specific question or task for that message. It is where the writing-clear-prompts guidance about context, constraints, format and examples mostly applies, since a user prompt is usually about one concrete thing rather than a standing rule for the whole conversation.',
          ],
        },
        {
          id: 'when-to-use-which',
          heading: 'When to put an instruction in the system prompt instead of repeating it',
          paragraphs: [
            'An instruction that should hold for every message — a tone, a persona, a boundary — belongs in the system prompt, so you are not restating it each turn and risking it being dropped or contradicted partway through a long conversation. A one-off request that only applies to the current message belongs in the user prompt. A system prompt is not a security boundary on its own; see what is prompt injection, linked below, for why an instruction in either place can still be overridden by adversarial content elsewhere in a conversation.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can a user message override a system prompt?',
          answer:
            'It depends on how a specific product handles it, and this is not a settled guarantee in general — a system prompt is meant as standing guidance, not an unbreakable rule. See what is prompt injection, linked below, for why treating it as an absolute security boundary is a mistake.',
        },
        {
          question: 'Do I need a system prompt for a simple, one-off question?',
          answer:
            'No — a system prompt earns its place when an instruction should apply across an entire conversation. For a single question, putting everything in the user prompt is simpler and just as effective.',
        },
        {
          question:
            'What kind of instruction belongs in a system prompt rather than a user prompt?',
          answer:
            'A standing rule that should not need repeating — a persona, a tone, a boundary the model should always respect. A specific, one-time request belongs in the user prompt instead.',
        },
      ],
      productNote:
        'ClawAI’s system prompt setting applies to a whole conversation the same way across every provider it routes to, so a standing instruction does not need to be rewritten per model.',
    },
    [PromptGuideTopic.ITERATING_ON_A_PROMPT]: {
      seo: {
        title: 'What to do when the first AI answer is not right',
        description:
          'A practical approach to debugging a prompt that did not get the answer you wanted — diagnosing what was missing rather than just repeating the request, and when to start over instead of patching.',
        keywords: ['improve an AI prompt', 'fix a bad AI answer', 'debugging AI prompts'],
      },
      eyebrow: 'Prompt guides',
      title: 'What to do when the first AI answer is not right',
      summary:
        'The first answer to a prompt is rarely the last word — most people get a better result by treating a disappointing answer as information about what the prompt was missing, then adjusting, rather than repeating the same request and hoping for something different. This guide walks through how to diagnose a bad answer and decide what to change.',
      sections: [
        {
          id: 'diagnose-before-you-rewrite',
          heading: 'Diagnose what went wrong before rewriting the whole prompt',
          paragraphs: [
            'A disappointing answer usually falls into one of a few categories: it missed context you had but did not state, it ignored a constraint, it used the wrong format, or it is confidently wrong about a fact. Naming which one happened points to a specific fix — a missing constraint calls for adding the constraint explicitly, not rewriting the whole prompt from scratch or repeating it more forcefully.',
          ],
        },
        {
          id: 'add-what-was-missing',
          heading: 'Add the specific thing that was missing, not more instructions in general',
          paragraphs: [
            'Once you know what was missing, add exactly that: the constraint, the example, the piece of context, or the format description that would have made the ask clear. See how to write a clear, specific prompt, linked below, for the fundamentals this step usually draws on — most iteration is applying the same handful of things the first prompt skipped.',
          ],
        },
        {
          id: 'know-when-to-start-over',
          heading: 'Know when to start a fresh prompt instead of patching',
          paragraphs: [
            'A long back-and-forth of small corrections can leave a conversation carrying contradictory instructions the model is now trying to reconcile — at that point, a fresh, complete prompt that states everything you have learned you need is often faster and more reliable than one more patch. This is also worth remembering when the answer is confidently wrong about a fact rather than just off-format: patching the wording will not fix that, since it is not a wording problem — see why AI hallucinates, linked below, for what is actually happening in that case.',
          ],
        },
      ],
      faq: [
        {
          question: 'The answer is well-written but factually wrong — how do I fix the prompt?',
          answer:
            'You mostly cannot fix this by rewording the prompt, because it is not a wording problem. See why AI hallucinates, linked below, for what is actually happening and what does help, such as asking the model to cite sources it can check or using a research mode that looks things up.',
        },
        {
          question: 'Should I keep correcting in the same conversation or start a new one?',
          answer:
            'Either can work, but a long chain of small corrections risks leaving contradictory instructions behind. If a conversation has had several corrections already, a fresh, complete prompt is often more reliable than one more patch.',
        },
        {
          question: 'How many times should I try before giving up on a prompt approach?',
          answer:
            'There is no fixed number — but if two or three specific, diagnosed fixes have not helped, the issue may not be the prompt at all. See choosing a model for your task, linked below, for whether the task might need a different kind of model instead.',
        },
      ],
      productNote:
        'Every conversation in ClawAI keeps its history, so you can iterate on a prompt across several turns and see exactly what changed between one answer and the next.',
    },
    [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]: {
      seo: {
        title: 'How prompting differs for code, writing, and analysis',
        description:
          'How the right prompting approach shifts between coding tasks, writing tasks, and analytical tasks — and how that connects to choosing the right model for each, not just the right words.',
        keywords: [
          'prompting for code vs writing',
          'AI prompts by task type',
          'prompting for analysis tasks',
        ],
      },
      eyebrow: 'Prompt guides',
      title: 'How prompting differs for code, writing, and analysis',
      summary:
        'The techniques in this hub — clarity, examples, step-by-step reasoning, format — apply everywhere, but which ones matter most shifts with the kind of task. This guide walks through what tends to help most for coding, for writing, and for analysis, and links to the model-fit cluster for the model side of the same question rather than re-explaining those task distinctions here.',
      sections: [
        {
          id: 'prompting-for-code',
          heading: 'Prompting for code: precision over persuasion',
          paragraphs: [
            'A coding prompt benefits most from precision — the exact function signature, the language and version, the constraint the code has to satisfy, an example of the expected input and output. Vague framing that would be harmless in a writing prompt ("make it good") gives a coding task almost nothing to work with, since there is no single correct shape to a request like that.',
          ],
        },
        {
          id: 'prompting-for-writing',
          heading: 'Prompting for writing: audience, tone, and one good example',
          paragraphs: [
            'A writing or editing prompt benefits most from the context and constraint guidance in how to write a clear, specific prompt, linked below — who the piece is for, the tone it should hold, and a length or structure constraint. An example of the target voice, per few-shot prompting, linked below, often does more work here than a longer description of the tone would.',
          ],
        },
        {
          id: 'prompting-for-analysis',
          heading: 'Prompting for analysis: asking for the reasoning, not just the conclusion',
          paragraphs: [
            'An analytical task — weighing options, interpreting data, working through a decision with several factors — usually benefits from chain-of-thought prompting, linked below: asking the model to lay out its reasoning rather than only stating a conclusion gives you something to check, and tends to surface a missed factor or a weak assumption. This is the same shape of task as choosing a model for complex reasoning, linked below, which covers which model is built for exactly this rather than repeating that guidance here.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does one prompting technique work best across all three task types?',
          answer:
            'No — precision matters most for code, audience and tone matter most for writing, and asking for visible reasoning matters most for analysis. Most tasks benefit from a mix, weighted toward whichever of these the task actually needs.',
        },
        {
          question: 'Does the model I choose matter as much as how I write the prompt?',
          answer:
            'Both matter, and they are different levers — this guide is about wording; see choosing a model for your task, linked below, for the model-fit side of coding, writing, and reasoning-heavy tasks specifically.',
        },
        {
          question: 'Is a coding prompt just a writing prompt with different words?',
          answer:
            'No — a coding task usually has a single correct or working shape, so precision about the exact requirement matters more than it does for most writing, where several different phrasings can all be good.',
        },
      ],
      productNote:
        'ClawAI’s routing modes already lean toward a fitting model per task — Auto and High Reasoning for analytical work, for example — so a well-written prompt and a fitting route work together rather than as separate choices.',
    },
  },
};
