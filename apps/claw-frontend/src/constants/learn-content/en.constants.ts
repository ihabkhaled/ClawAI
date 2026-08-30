import { LearnTopic } from '@/enums/learn-topic.enum';
import type { LearnDictionary } from '@/types/learn.types';

export const EN_LEARN_CONTENT: LearnDictionary = {
  labels: {
    onThisPage: 'On this page',
    faqTitle: 'Questions people ask',
    relatedTitle: 'Where to go next',
    lastReviewed: 'Last reviewed',
    backToHub: 'All explainers',
    ctaTitle: 'Try it rather than read about it',
    ctaBody:
      'ClawAI puts these techniques behind one workspace, so you can run the same prompt through several models and see the difference yourself.',
    startFree: 'Start on the free plan',
    seeFeatures: 'See what ClawAI does',
  },
  hub: {
    seo: {
      title: 'Learn: multi-model AI, routing and orchestration',
      description:
        'Plain explanations of the techniques behind multi-model AI — routing, consensus, verification, RAG, memory, and running open-weight models on your own hardware.',
      keywords: ['LLM orchestration', 'AI model routing', 'multi-model AI'],
    },
    eyebrow: 'Explainers',
    title: 'How multi-model AI actually works',
    summary:
      'Short, practical explanations of the ideas behind routing a prompt to more than one model — what each technique does, when it earns its cost, and when a single model is the better answer. No vendor benchmarks, no invented numbers.',
    topicsHeading: 'Pick a concept',
    cardSummaries: {
      [LearnTopic.WHAT_IS_MULTI_MODEL_AI]:
        'Using several models in one workflow instead of committing to one.',
      [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]:
        'The layer that decides which model runs, in what order, and what happens to the output.',
      [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]:
        'Sending each request to a model chosen by task, cost, privacy or latency.',
      [LearnTopic.WHAT_IS_MODEL_FALLBACK]:
        'What should happen when the first model is down, rate-limited or refuses.',
      [LearnTopic.WHAT_IS_AI_CONSENSUS]:
        'Asking several models the same question and using their agreement as a signal.',
      [LearnTopic.WHAT_IS_BEST_OF_N]:
        'Generating several candidate answers and keeping the best one.',
      [LearnTopic.WHAT_IS_AN_AI_JUDGE]:
        'Using a model to score other models’ answers, and where that breaks down.',
      [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]:
        'Checking an answer against something other than the model that produced it.',
      [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]:
        'The working memory of a single request, and why it is not the same as memory.',
      [LearnTopic.WHAT_IS_RAG]:
        'Retrieving your own documents and putting them in front of the model.',
      [LearnTopic.WHAT_IS_AI_MEMORY]: 'What persists between conversations, and what it costs you.',
      [LearnTopic.WHAT_ARE_CONTEXT_PACKS]:
        'Reusable bundles of context you attach to a conversation on purpose.',
      [LearnTopic.WHAT_IS_LOCAL_AI]:
        'Running a model on hardware you control, and what that actually changes.',
      [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]:
        'Models whose weights you can download — and what "open" does and does not mean.',
      [LearnTopic.WHAT_IS_SELF_HOSTED_AI]:
        'Running the whole application yourself, not just the model.',
      [LearnTopic.OLLAMA_VS_LLAMACPP]:
        'Two ways to run open-weight models locally, and which job each suits.',
      [LearnTopic.CLOUD_AI_VS_LOCAL_AI]:
        'The real trade: capability and convenience against control and cost shape.',
      [LearnTopic.AI_AGENT_VS_AI_CHATBOT]:
        'The difference between answering you and doing something for you.',
    },
  },
  topics: {
    [LearnTopic.WHAT_IS_MULTI_MODEL_AI]: {
      seo: {
        title: 'What is multi-model AI?',
        description:
          'Multi-model AI means using several language models in one workflow instead of committing to one. What it solves, what it costs, and when one model is enough.',
        keywords: ['multi-model AI', 'multiple AI models', 'AI model choice'],
      },
      eyebrow: 'Foundations',
      title: 'What is multi-model AI?',
      summary:
        'Multi-model AI means treating language models as interchangeable parts rather than picking one and building everything around it. The same question can go to a fast cheap model, a heavy reasoning model, or a model running on your own hardware — chosen per request rather than once, at purchase time.',
      sections: [
        {
          id: 'the-problem',
          heading: 'The problem it solves',
          paragraphs: [
            'Models are not uniformly better or worse than one another. One writes cleaner code, another follows long documents more faithfully, a third answers in a fraction of the time for a fraction of the cost. Committing to a single provider means accepting that provider’s weakest area on every task you have.',
            'It also means accepting their outages, their rate limits, their pricing changes and their deprecations. When a model you depend on is retired, a single-model workflow has to be rebuilt. A multi-model workflow changes a setting.',
          ],
        },
        {
          id: 'what-it-looks-like',
          heading: 'What it looks like in practice',
          paragraphs: [
            'At its simplest, multi-model AI is a dropdown: you pick the model per conversation. That is already useful, and it is where most people start.',
            'It becomes more interesting when the choice is automatic — when a router reads the request and sends it somewhere appropriate — and more interesting still when several models answer at once and their answers are compared, scored, or merged. Those are separate techniques, each with its own cost, and each covered on its own page here.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'What it costs',
          paragraphs: [
            'Every model you add is another provider account, another set of credentials, another billing relationship and another format of usage data. That overhead is the honest argument against multi-model work, and it is why most teams do not do it by hand.',
            'Running several models on the same prompt multiplies the token cost of that prompt. Techniques like consensus and best-of-N are worth their price on decisions that matter and are waste on routine questions. Knowing which is which is most of the skill.',
          ],
        },
        {
          id: 'when-one-is-enough',
          heading: 'When one model is the right answer',
          paragraphs: [
            'If your workload is narrow and one model handles it well, adding more is complexity without benefit. Multi-model approaches pay off when your workloads are varied, when cost per task differs by an order of magnitude across your requests, or when some of your data cannot go to a third party at all.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is multi-model AI just an API gateway?',
          answer:
            'A gateway gives you one endpoint for several providers, which solves the plumbing. Multi-model AI is what you do with that: choosing per request, comparing answers, falling back on failure. The gateway is a prerequisite, not the technique.',
        },
        {
          question: 'Does using several models make answers more accurate?',
          answer:
            'Not by itself. Sending a prompt to three models gives you three answers, not a better one. Accuracy improves only when you add a way to choose between them — agreement, scoring, or an external check — and each of those has failure modes of its own.',
        },
        {
          question: 'Do I need several subscriptions?',
          answer:
            'If you go direct to each provider, yes. Platforms that aggregate providers exist partly to avoid that. ClawAI is one of them: {cloudProviderCount} cloud providers plus local runtimes under one account.',
        },
      ],
      productNote:
        'ClawAI is built around this idea: {cloudProviderCount} cloud providers and local open-weight models in one workspace, with the model that answered recorded on every message.',
    },
    [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]: {
      seo: {
        title: 'What is LLM orchestration?',
        description:
          'LLM orchestration is the layer that decides which model runs, in what order, and what happens to the output. How it differs from prompting and from agents.',
        keywords: ['LLM orchestration', 'AI orchestration', 'model pipeline'],
      },
      eyebrow: 'Foundations',
      title: 'What is LLM orchestration?',
      summary:
        'Orchestration is everything around the model call. Choosing which model runs, deciding whether one call is enough, passing output from one step into the next, and deciding what to do when a step fails. The prompt is one instruction; orchestration is the program the instruction runs inside.',
      sections: [
        {
          id: 'not-prompting',
          heading: 'It is not prompt engineering',
          paragraphs: [
            'Prompt engineering improves a single call. Orchestration decides how many calls there are, which models make them, and how their outputs combine. You can have excellent prompts and no orchestration, and the result is a system that fails the moment one provider has a bad hour.',
            'The distinction matters because the two are optimised differently. A better prompt is cheap and improves quality slightly. Better orchestration costs tokens and improves reliability substantially.',
          ],
        },
        {
          id: 'what-it-decides',
          heading: 'What an orchestration layer decides',
          paragraphs: [
            'Which model. Whether to ask more than one. Whether to check the answer before returning it. What to do on a refusal, a timeout, or a rate limit. Whether the output of this step becomes the input of the next. Whether the whole thing is affordable before it starts.',
            'Each of those is a policy, and each can be wrong independently. That is why orchestration is worth naming as its own layer rather than scattering the decisions through application code.',
          ],
        },
        {
          id: 'techniques',
          heading: 'The common techniques',
          paragraphs: [
            'Routing sends a request to an appropriate model. Fallback handles failure. Consensus asks several models and looks at agreement. Best-of-N generates candidates and keeps one. A judge scores answers. Verification checks a claim against something outside the model. Pipelines chain steps. Task decomposition splits a large request into smaller ones.',
            'ClawAI implements nine of these as separate orchestration modes, plus judge and compare as their own surfaces. Each has a page here explaining what it is before you decide whether you want it.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'When not to orchestrate',
          paragraphs: [
            'Orchestration multiplies cost and latency. A three-model consensus is roughly three times the tokens and as slow as the slowest model. For a question whose answer you can check at a glance, that is a bad trade.',
            'The heuristic that holds up: orchestrate when being wrong is expensive and checking is hard. Otherwise send one request to one model and read the answer.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is orchestration the same as an agent framework?',
          answer:
            'Overlapping but not identical. An agent decides its own next step, often with tools. Orchestration is the surrounding policy — which model, how many, what on failure — and applies just as much to a workflow with no agent in it.',
        },
        {
          question: 'Does orchestration need a framework?',
          answer:
            'No. A retry with a different model is orchestration. Frameworks help when the policies get numerous enough that you would otherwise be reimplementing them per feature.',
        },
        {
          question: 'How much does it cost?',
          answer:
            'In tokens, roughly proportional to how many model calls the policy makes. A single routed call costs about the same as an unrouted one; consensus over three models costs about three times as much. The cost is predictable, which is what makes it a budgeting decision rather than a gamble.',
        },
      ],
      productNote:
        'ClawAI runs {orchestrationLabCount} orchestration modes alongside ordinary chat, and records which models a run used, so the cost of a technique is visible rather than inferred.',
    },
    [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]: {
      seo: {
        title: 'What is AI model routing?',
        description:
          'Model routing sends each request to a model chosen by task, cost, privacy or latency instead of using one model for everything. How routers decide, and how they fail.',
        keywords: ['AI model routing', 'LLM router', 'model selection'],
      },
      eyebrow: 'Routing',
      title: 'What is AI model routing?',
      summary:
        'A router looks at a request before it runs and picks which model should answer. The point is that the right model differs by request: a one-line question and a thousand-line refactor do not deserve the same model, and paying frontier prices for both is a choice nobody makes deliberately.',
      sections: [
        {
          id: 'how-decisions-are-made',
          heading: 'What a router decides on',
          paragraphs: [
            'Most routers combine a few signals: what kind of task it looks like, how long the input is, how sensitive the data is, how fast the answer needs to be, and how much the request is allowed to cost.',
            'Those signals conflict. The fastest model is rarely the strongest; the most private option is rarely the most capable. A router is really a policy about which of those to sacrifice, so the useful ones let you say which you care about rather than guessing.',
          ],
        },
        {
          id: 'automatic-vs-explicit',
          heading: 'Automatic and explicit routing',
          paragraphs: [
            'Automatic routing reads the request and decides. It is convenient and occasionally wrong, and being wrong is hard to notice if the system does not tell you which model answered.',
            'Explicit routing means you state the priority — keep this local, keep this cheap, use the strongest reasoning available — and the router honours it. In practice most people want both: a sensible default, and the ability to override it for the request in front of them.',
          ],
        },
        {
          id: 'failure-modes',
          heading: 'How routing goes wrong',
          paragraphs: [
            'The two common failures are silent downgrades and invisible decisions. A silent downgrade is a router quietly sending your careful request to a cheap model. An invisible decision is any routing you cannot audit after the fact.',
            'Both have the same fix: the system should record which model actually answered, and show it. A router you cannot inspect is indistinguishable from a router that is broken.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'How ClawAI does it',
          paragraphs: [
            'ClawAI has {routingModeCount} routing modes. Auto reads the request and chooses. Manual pins one model. Local-only keeps the whole chain on models running on your own hardware. Privacy-first prefers local and refuses to leave it silently. The rest bias the choice toward lower latency, stronger reasoning, or lower cost.',
            'Every answer records the model that produced it, so an automatic decision is checkable rather than trusted.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does routing reduce answer quality?',
          answer:
            'It can, if the policy is wrong for the request. That is why the mode is yours to choose and why the model that answered is shown. Routing that you can see and override is a cost control; routing you cannot is a downgrade.',
        },
        {
          question: 'Can a router keep data off cloud providers entirely?',
          answer:
            'Only if it is allowed to refuse rather than fall back. A local-only mode whose fallback chain reaches a cloud provider is not a privacy control. ClawAI’s local-only mode keeps its fallback chain on local providers.',
        },
        {
          question: 'Is routing worth it for one person?',
          answer:
            'Usually yes, for cost rather than reliability. Most individual workloads are mostly routine questions with a few hard ones; sending the routine ones to a cheaper model is the single biggest lever on a personal AI bill.',
        },
      ],
      productNote:
        'ClawAI ships {routingModeCount} routing modes and shows the chosen model on every message, so you can check the router rather than trust it.',
    },
    [LearnTopic.WHAT_IS_MODEL_FALLBACK]: {
      seo: {
        title: 'What is model fallback?',
        description:
          'Model fallback is what happens when the first model fails — down, rate-limited, or refusing. How fallback chains work and why silent fallback is dangerous.',
        keywords: ['model fallback', 'LLM failover', 'AI reliability'],
      },
      eyebrow: 'Routing',
      title: 'What is model fallback?',
      summary:
        'Fallback is the answer to "what happens when the model you wanted is not available". Providers have outages, rate limits, content refusals and timeouts. A fallback chain is an ordered list of what to try next, and the order encodes what you are willing to compromise.',
      sections: [
        {
          id: 'why-needed',
          heading: 'Why it is not optional',
          paragraphs: [
            'A single-provider workflow inherits that provider’s availability exactly. Rate limits in particular are not rare events — they are the normal consequence of a busy hour — and a workflow with no fallback simply stops.',
            'Fallback turns a hard failure into a degraded answer. Whether that is an improvement depends entirely on whether you are told it happened.',
          ],
        },
        {
          id: 'what-to-fall-back-to',
          heading: 'Choosing the order',
          paragraphs: [
            'The intuitive order is "next best model", but that is often wrong. If the first choice failed because the request was too long, a smaller model will fail too. If it refused on content grounds, a similar model will refuse similarly.',
            'A more useful order changes something structural: a different provider entirely, or a local model with different rules, rather than a sibling that will fail the same way.',
          ],
        },
        {
          id: 'silent-fallback',
          heading: 'The dangerous kind',
          paragraphs: [
            'Silent fallback is a system that quietly answers with a different model and tells you nothing. You get a worse answer, attributed in your mind to the model you chose, and you draw a wrong conclusion about that model.',
            'When the fallback crosses a privacy boundary it is worse than a wrong conclusion. Falling back from a local model to a cloud provider sends data somewhere the user specifically chose to avoid. A fallback chain that can leave local execution should be a chain the user opted into explicitly.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'How ClawAI does it',
          paragraphs: [
            'Routing modes define their own chains, and the local-only mode keeps its chain on local providers rather than reaching for a cloud model when the local one is busy. Every message records the model that actually answered, so a fallback is visible after the fact rather than inferred from a change in tone.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is fallback the same as a retry?',
          answer:
            'A retry sends the same request to the same model, which helps with a transient error. Fallback changes the model, which helps when the first one cannot serve the request at all. Most robust systems do both, in that order.',
        },
        {
          question: 'Should fallback ever cross from local to cloud?',
          answer:
            'Only if the user asked for that. Local execution is usually chosen for a reason that a fallback cannot honour, so the safe default is to fail and say so rather than to succeed elsewhere.',
        },
        {
          question: 'How many models should a chain have?',
          answer:
            'Two or three is usually enough. Long chains mostly add latency, because every failed attempt is paid for in time before the next one starts.',
        },
      ],
      productNote:
        'ClawAI’s routing modes carry their own fallback chains, and local-only keeps its chain local rather than silently reaching a cloud provider.',
    },
    [LearnTopic.WHAT_IS_AI_CONSENSUS]: {
      seo: {
        title: 'What is AI consensus?',
        description:
          'Consensus asks several models the same question and treats their agreement as a signal. What agreement does and does not tell you, and when the cost is justified.',
        keywords: ['AI consensus', 'multi-model agreement', 'LLM ensemble'],
      },
      eyebrow: 'Orchestration',
      title: 'What is AI consensus?',
      summary:
        'Consensus runs one prompt through several models and compares the answers. Where they agree, you have a weak signal that the answer is not an artefact of one model. Where they disagree, you have something more useful: a flag that the question is harder than it looked.',
      sections: [
        {
          id: 'what-agreement-means',
          heading: 'What agreement actually tells you',
          paragraphs: [
            'Agreement is evidence, not proof. Models trained on overlapping data share biases and can be confidently wrong in the same direction. Three models agreeing on a false fact is a common outcome, not a rare one.',
            'The signal is stronger when the models are genuinely different — different vendors, different training, different sizes. Consensus across three variants of the same family is close to worthless.',
          ],
        },
        {
          id: 'disagreement-is-the-value',
          heading: 'Disagreement is the more useful output',
          paragraphs: [
            'The practical value of consensus is usually the negative case. When models diverge, you have located a question that needs a person — and locating those cheaply is worth more than a marginal confidence boost on the questions that were easy anyway.',
            'This reframes when to use it. Consensus is not a quality upgrade applied to everything; it is a triage tool applied where being wrong is costly.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'The cost',
          paragraphs: [
            'Running three models costs roughly three times the tokens and takes as long as the slowest. On a routine question that is pure waste. On a contract clause, a migration plan, or a medical summary you intend to act on, it is cheap.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'When not to use it',
          paragraphs: [
            'Do not use consensus for questions with a checkable answer. If code either compiles or does not, run it — that is a stronger signal than three models agreeing about it. Consensus is for judgement questions where no cheap external check exists.',
          ],
        },
      ],
      faq: [
        {
          question: 'How many models do I need?',
          answer:
            'Three is the usual choice, because two can only agree or disagree while three shows you the shape of a disagreement. More than three rarely changes the decision and multiplies the bill.',
        },
        {
          question: 'Does consensus prevent hallucination?',
          answer:
            'No. It catches hallucinations that are specific to one model, and misses the ones several models share. It is a filter, not a guarantee.',
        },
        {
          question: 'Is this the same as best-of-N?',
          answer:
            'No. Consensus compares answers from different models to see whether they agree. Best-of-N generates several candidates and picks one. Consensus measures agreement; best-of-N selects quality.',
        },
      ],
      productNote:
        'Consensus is one of ClawAI’s {orchestrationLabCount} orchestration modes, and each run records every model it used and what that run cost.',
    },
    [LearnTopic.WHAT_IS_BEST_OF_N]: {
      seo: {
        title: 'What is best-of-N sampling?',
        description:
          'Best-of-N generates several candidate answers and keeps the best. How candidates are chosen, why the selector matters more than N, and when it beats one good prompt.',
        keywords: ['best of N', 'candidate sampling', 'LLM answer selection'],
      },
      eyebrow: 'Orchestration',
      title: 'What is best-of-N?',
      summary:
        'Best-of-N asks for several answers to the same prompt and keeps one. It exploits the fact that model output varies between runs: a model that answers well seven times out of ten will, given three attempts, usually produce at least one good answer. The technique lives or dies on how you pick the winner.',
      sections: [
        {
          id: 'why-it-works',
          heading: 'Why it works at all',
          paragraphs: [
            'Language model output is sampled, not deterministic. Two runs of the same prompt give different answers, and their quality varies. If the model’s good answers outnumber its bad ones, taking several samples raises the chance that at least one is good.',
            'That is the entire mechanism. It does not make the model smarter; it gives you more chances at the model’s existing ability.',
          ],
        },
        {
          id: 'the-selector',
          heading: 'Picking the winner is the hard part',
          paragraphs: [
            'Generating candidates is easy. Choosing between them is the real problem, and it is where most of the technique’s value and most of its failure lives.',
            'Selection by an automated check — does it compile, does it pass the tests, does it satisfy the schema — is by far the most reliable, because the check is independent of the model. Selection by another model is a judge, with all the caveats on that page. Selection by a person is the most accurate and the least scalable.',
          ],
        },
        {
          id: 'choosing-n',
          heading: 'Choosing N',
          paragraphs: [
            'Returns fall off quickly. Going from one candidate to three is a large improvement; three to ten is a small one at more than three times the cost. Most practical uses sit at three to five.',
            'N multiplies cost exactly. Five candidates is five times the generation tokens, plus whatever the selection costs.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'When not to use it',
          paragraphs: [
            'If you have no way to tell a good answer from a bad one, best-of-N cannot help you — you will pick at random from a larger pool and pay more for the privilege. Its natural home is work with an objective check: code, structured output, anything that either parses or does not.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is best-of-N the same as raising temperature?',
          answer:
            'No, though they interact. Temperature controls how varied each answer is. Best-of-N is about how many you take and how you choose. Some variety helps, because identical candidates give you nothing to choose between.',
        },
        {
          question: 'Can I use different models for the candidates?',
          answer:
            'Yes, and it often helps — different models fail differently, so the pool is more varied than repeated samples from one. At that point you are close to consensus, with selection instead of agreement.',
        },
        {
          question: 'Does it help with factual accuracy?',
          answer:
            'Only if your selector can detect factual errors. Without an external check you are choosing between confident answers, and confidence is not accuracy.',
        },
      ],
      productNote:
        'Best-of-N is one of ClawAI’s {orchestrationLabCount} orchestration modes, and every candidate it generates is recorded against the run’s cost.',
    },
    [LearnTopic.WHAT_IS_AN_AI_JUDGE]: {
      seo: {
        title: 'What is an AI judge?',
        description:
          'An AI judge is a model that scores other models’ answers. How judging is used, the biases it carries, and why a judge is not a substitute for a real check.',
        keywords: ['AI judge', 'LLM as judge', 'answer scoring'],
      },
      eyebrow: 'Orchestration',
      title: 'What is an AI judge?',
      summary:
        'A judge is a model given a different job: instead of answering the question, it reads answers and rates them. It is how most automated selection between candidates is done, and it carries a set of biases that are well documented and easy to forget.',
      sections: [
        {
          id: 'what-it-does',
          heading: 'What a judge does',
          paragraphs: [
            'A judge receives the original question and two or more answers, and returns a ranking or a score, usually with a reason. It is the selection step in best-of-N, and the arbitration step when models disagree.',
            'The appeal is obvious: it scales in a way human review does not, and it is far cheaper than the person it stands in for.',
          ],
        },
        {
          id: 'the-biases',
          heading: 'The biases, which are consistent',
          paragraphs: [
            'Judges favour longer answers over shorter ones, even when the shorter answer is complete. They favour confident phrasing over hedged phrasing, regardless of whether the confidence is warranted. They are sensitive to the order candidates are presented in. And a model asked to judge its own output tends to prefer it.',
            'None of these is subtle, and all of them are manageable — shuffle the order, use a different model as judge than as author, and ask for specific criteria rather than a general preference. But they have to be managed deliberately, because the default setup exhibits all four.',
          ],
        },
        {
          id: 'not-a-check',
          heading: 'A judge is not a verifier',
          paragraphs: [
            'A judge compares answers to each other. It does not compare them to reality. Given three wrong answers it will confidently rank them, and the winner will still be wrong.',
            'Where an external check exists — tests, a schema, a search — that check beats a judge, because it is independent of the thing being judged. A judge is what you use when no such check is available.',
          ],
        },
      ],
      faq: [
        {
          question: 'Should the judge be the strongest model?',
          answer:
            'Usually a strong one, and preferably not the same model that wrote the candidates. Self-preference is real and the cheapest fix is to use a different model.',
        },
        {
          question: 'Can a judge score a single answer?',
          answer:
            'It can, but comparative judgement is more reliable than absolute scoring. Models are better at "which of these is better" than at "is this a 7 or an 8".',
        },
        {
          question: 'How do I know the judge is right?',
          answer:
            'Spot-check it against your own judgement on a sample. If you never check, you have moved the trust rather than earned it.',
        },
      ],
      productNote:
        'ClawAI runs judging as its own surface over a compare run, so a scored answer records both the models that wrote the candidates and the model that judged them.',
    },
    [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]: {
      seo: {
        title: 'What is AI answer verification?',
        description:
          'Verification checks an answer against something other than the model that produced it. Why independence is the whole point, and what a self-check is really worth.',
        keywords: ['AI verification', 'answer checking', 'LLM accuracy'],
      },
      eyebrow: 'Orchestration',
      title: 'What is AI answer verification?',
      summary:
        'Verification is checking a generated answer against a source that is not the generator. The key word is independent: a model reviewing its own answer shares the reasoning that produced the error, which is why self-checks catch far less than people expect.',
      sections: [
        {
          id: 'independence',
          heading: 'Independence is the whole idea',
          paragraphs: [
            'If a model invents a fact because of something in its training, asking that model whether the fact is true consults the same source that invented it. The check and the error have a common cause, so the check passes.',
            'A useful verifier changes something. A different model, a search against real documents, a compiler, a test suite, a schema validator. The more different the checker is from the generator, the more it can catch.',
          ],
        },
        {
          id: 'kinds',
          heading: 'Kinds of verification, weakest to strongest',
          paragraphs: [
            'Self-review: the model rereads its answer. Cheap, and catches mostly formatting and internal contradictions. Cross-model review: a different model checks. Better, and catches errors specific to the first. Retrieval: the claim is checked against retrieved documents. Strong for factual claims. Execution: the code runs, the schema validates, the tests pass. Strongest, and only available where the answer is executable.',
            'The pattern is that strength tracks independence from the model, and availability runs the other way — the strongest checks only exist for some kinds of work.',
          ],
        },
        {
          id: 'repair',
          heading: 'Verification and repair',
          paragraphs: [
            'A verifier that only reports a problem leaves you where you started. In practice verification is usually paired with repair: the failure and its reason go back to a model, which produces a corrected answer, which is checked again.',
            'That loop needs a limit. Without one, a model that cannot fix the problem will keep producing variations of the same wrong answer at full price.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does asking a model to double-check help?',
          answer:
            'A little, and mostly for internal inconsistency rather than factual error. It is the weakest form of verification and the easiest to over-trust.',
        },
        {
          question: 'Is retrieval verification the same as RAG?',
          answer:
            'They use the same machinery in opposite directions. RAG retrieves before generating, to inform the answer. Retrieval verification retrieves after, to check it.',
        },
        {
          question: 'How many repair attempts are sensible?',
          answer:
            'One or two. If a model has not fixed it by the second attempt, further attempts usually produce restatements of the same error, and a person should look.',
        },
      ],
      productNote:
        'Verification and repair are two of ClawAI’s {orchestrationLabCount} orchestration modes, and both are metered per attempt so a repair loop cannot run up an invisible bill.',
    },
    [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]: {
      seo: {
        title: 'What is a context window?',
        description:
          'A context window is how much text a model can consider in one request. Why it is not memory, why filling it degrades quality, and how it drives cost.',
        keywords: ['context window', 'LLM tokens', 'long context'],
      },
      eyebrow: 'Context',
      title: 'What is a context window?',
      summary:
        'The context window is the total amount of text a model can hold in a single request — your prompt, the conversation so far, any documents you attached, and the answer being written. It is measured in tokens, and it resets completely between requests.',
      sections: [
        {
          id: 'not-memory',
          heading: 'It is not memory',
          paragraphs: [
            'A model does not remember your last conversation. What creates the illusion of memory is that the application resends the earlier messages with each new request. The window is working space for one call, not storage.',
            'This has a direct consequence people meet as a surprise: a long conversation gets more expensive with every message, because the whole history is re-sent and re-charged each time.',
          ],
        },
        {
          id: 'filling-it',
          heading: 'A full window is not a well-used one',
          paragraphs: [
            'A large window is an allowance, not a target. Models attend unevenly across a long context — material in the middle of a very long input is more likely to be treated lightly than material at either end.',
            'In practice a focused ten pages usually beats an unfocused two hundred. Retrieval exists precisely to choose those ten pages rather than sending everything and hoping.',
          ],
        },
        {
          id: 'cost',
          heading: 'How it drives cost',
          paragraphs: [
            'Almost all providers bill by token, input and output separately, and input is usually cheaper. A large document attached to every message in a long conversation is charged on every message, not once.',
            'This is the single most common cause of a surprising bill, and the fix is structural: attach what the question needs rather than everything that might be relevant.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is a bigger context window always better?',
          answer:
            'It removes a limit, which is good, but it does not improve how well the model uses what it is given. A bigger window mostly buys you the ability to make a more expensive mistake.',
        },
        {
          question: 'What is a token?',
          answer:
            'Roughly a word fragment. English text runs around three-quarters of a word per token on average, so a thousand tokens is about seven hundred and fifty words — but this varies by language, and non-Latin scripts often use more tokens per word.',
        },
        {
          question: 'What happens when I exceed it?',
          answer:
            'The request fails, or the application silently drops the oldest messages. The second is more common and more confusing, because the model appears to forget something you said.',
        },
      ],
      productNote:
        'ClawAI records the tokens each message consumed, so a conversation that is getting expensive is visible before the invoice rather than after it.',
    },
    [LearnTopic.WHAT_IS_RAG]: {
      seo: {
        title: 'What is RAG (retrieval-augmented generation)?',
        description:
          'RAG retrieves relevant passages from your own documents and puts them in front of the model. How chunking and retrieval quality decide whether it works.',
        keywords: ['RAG', 'retrieval augmented generation', 'document AI'],
      },
      eyebrow: 'Context',
      title: 'What is retrieval-augmented generation?',
      summary:
        'RAG means searching your own documents for passages relevant to a question, and including those passages in the request. The model answers from material you supplied rather than from memory, which is what makes it able to talk about documents it was never trained on.',
      sections: [
        {
          id: 'how-it-works',
          heading: 'How it works',
          paragraphs: [
            'Documents are split into chunks and each chunk is converted into a vector — a numeric representation of its meaning. The question is converted the same way, and the chunks whose vectors are closest are retrieved.',
            'Those chunks are inserted into the prompt, usually with an instruction to answer from them. The model does the language work; the retrieval does the knowing.',
          ],
        },
        {
          id: 'retrieval-quality',
          heading: 'Retrieval quality is the whole system',
          paragraphs: [
            'If the right passage is not retrieved, no model can rescue the answer — it will answer from general knowledge and sound just as confident. Most disappointing RAG systems are retrieval problems wearing a generation costume.',
            'Chunking is where this is decided. Chunks that are too small lose the context that made them meaningful; too large and each one dilutes the match. Splitting on document structure — sections, headings — usually beats splitting on a fixed length.',
          ],
        },
        {
          id: 'what-it-fixes',
          heading: 'What it does and does not fix',
          paragraphs: [
            'RAG fixes "the model has never seen my documents". It reduces hallucination on questions the documents answer, because the answer is in front of the model.',
            'It does not fix reasoning, and it does not stop the model answering from memory when retrieval returns nothing useful. Grounding is a strong tendency, not a guarantee, and the failure mode is a confident answer with no source.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is RAG the same as fine-tuning?',
          answer:
            'No, and they solve different problems. Fine-tuning changes how a model behaves; RAG changes what it knows for one request. For "answer questions about my documents", RAG is almost always the right tool and far cheaper to keep current.',
        },
        {
          question: 'Do large context windows make RAG obsolete?',
          answer:
            'No. You can paste more in, but you pay for every token on every message and models attend unevenly across very long inputs. Retrieval is also the only approach that scales past what any window holds.',
        },
        {
          question: 'Does RAG send my documents to the model provider?',
          answer:
            'The retrieved passages, yes — that is how the model sees them. If that is unacceptable, the model has to run somewhere you control, which is what local execution is for.',
        },
      ],
      productNote:
        'ClawAI retrieves from files you attach, and pairs it with local execution so the retrieved passages can stay on your own hardware.',
    },
    [LearnTopic.WHAT_IS_AI_MEMORY]: {
      seo: {
        title: 'What is AI memory?',
        description:
          'AI memory is what an assistant keeps between conversations. How it differs from a context window, what it costs in tokens, and the privacy question it raises.',
        keywords: ['AI memory', 'persistent context', 'assistant memory'],
      },
      eyebrow: 'Context',
      title: 'What is AI memory?',
      summary:
        'Memory is the application storing facts about you and reintroducing them into later conversations. The model itself remembers nothing between requests; memory is a feature built around it, and it has a cost and a privacy shape that are worth understanding before turning it on.',
      sections: [
        {
          id: 'mechanism',
          heading: 'How it actually works',
          paragraphs: [
            'The application decides something is worth keeping — a preference, a fact, a standing instruction — and writes it down. On a later conversation it selects the relevant entries and adds them to the request before the model sees it.',
            'So memory is retrieval over a store of facts about you, rather than anything happening inside the model. Which means it is only as good as the decisions about what to keep and what to reintroduce.',
          ],
        },
        {
          id: 'cost',
          heading: 'It is not free',
          paragraphs: [
            'Every remembered fact reintroduced into a conversation is input tokens, charged on every message that carries it. A large memory that is injected indiscriminately is a permanent tax on every conversation you have.',
            'Good implementations are selective: they bring back what is relevant to this conversation rather than everything they know.',
          ],
        },
        {
          id: 'privacy',
          heading: 'The privacy question',
          paragraphs: [
            'Memory means a durable store of personal facts, which is a different privacy proposition from a conversation you can delete. The questions worth asking are where it is stored, whether you can read the whole of it, whether you can delete individual entries, and whether it is sent to a model provider when reintroduced.',
            'The last one is the one people miss. A remembered fact that gets injected into a prompt goes wherever that prompt goes.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does memory train the model on my data?',
          answer:
            'Not in itself. Memory puts text in a prompt; training changes model weights. Whether a provider trains on prompts is a separate question and depends on that provider’s terms.',
        },
        {
          question: 'Why does the assistant remember something wrong?',
          answer:
            'Because it wrote down something that was true once, or misread a passing remark as a standing preference. Being able to read and edit the store directly is the only real fix.',
        },
        {
          question: 'Is memory the same as a long conversation?',
          answer:
            'No. A long conversation keeps everything and pays for all of it every message. Memory keeps selected facts and survives the conversation ending.',
        },
      ],
      productNote:
        'Memory in ClawAI is a stored, inspectable set of entries rather than an opaque profile, and it can be paired with local execution so remembered facts stay on hardware you control.',
    },
    [LearnTopic.WHAT_ARE_CONTEXT_PACKS]: {
      seo: {
        title: 'What are context packs?',
        description:
          'Context packs are reusable bundles of context you attach to a conversation deliberately. How they differ from memory and RAG, and when a curated bundle wins.',
        keywords: ['context packs', 'reusable AI context', 'prompt context'],
      },
      eyebrow: 'Context',
      title: 'What are context packs?',
      summary:
        'A context pack is a named, reusable bundle of material — instructions, reference text, files, links — that you attach to a conversation on purpose. It sits between memory, which the system chooses for you, and a one-off attachment, which you rebuild every time.',
      sections: [
        {
          id: 'the-gap',
          heading: 'The gap they fill',
          paragraphs: [
            'Memory is automatic: the system decides what to keep and when to reintroduce it, which is convenient and imprecise. A one-off attachment is precise and disposable — you gather the same five documents again next week.',
            'A pack is the middle: assembled once, deliberately, and applied when you choose. Your coding standards, your product’s terminology, the constraints a piece of work has to respect.',
          ],
        },
        {
          id: 'what-goes-in',
          heading: 'What belongs in one',
          paragraphs: [
            'Material that is stable and that you would otherwise re-explain: house style, domain vocabulary, standing constraints, the shape of an output you always want.',
            'What does not belong is anything that changes per question. A pack you edit every time you use it is a prompt with extra steps.',
          ],
        },
        {
          id: 'cost-and-discipline',
          heading: 'Cost and discipline',
          paragraphs: [
            'A pack is input tokens on every message it is attached to, so a large pack applied to everything is the context-window cost problem in a new shape. Several small, specific packs beat one large general one.',
            'Because a pack is explicit, it is also reviewable — you can read exactly what is being sent, which is not true of memory that assembles itself.',
          ],
        },
      ],
      faq: [
        {
          question: 'How is this different from a system prompt?',
          answer:
            'A system prompt is usually one block of instructions set once. A pack is a named bundle you attach and detach per conversation, and it can carry files and references rather than only instructions.',
        },
        {
          question: 'Can I use several at once?',
          answer:
            'Yes, and composing small ones is the point — a language pack plus a house-style pack rather than one bundle per project.',
        },
        {
          question: 'Do packs replace RAG?',
          answer:
            'No. A pack is curated by hand and always included; retrieval selects from a large corpus per question. Packs suit stable material; retrieval suits material too large to attach.',
        },
      ],
      productNote:
        'Context packs in ClawAI are reusable bundles you attach per conversation, so what the model receives is something you assembled rather than something inferred about you.',
    },
    [LearnTopic.WHAT_IS_LOCAL_AI]: {
      seo: {
        title: 'What is local AI?',
        description:
          'Local AI runs a model on hardware you control. What it changes about privacy and cost, what it demands in hardware, and where it genuinely competes.',
        keywords: ['local AI', 'on-premise AI', 'private AI'],
      },
      eyebrow: 'Local and private',
      title: 'What is local AI?',
      summary:
        'Local AI means the model runs on a machine you control — your laptop, your server, your rack — rather than as a call to somebody else’s API. The prompt does not leave the hardware, which changes the privacy question completely and changes the cost question in a way that is often misunderstood.',
      sections: [
        {
          id: 'what-changes',
          heading: 'What it changes',
          paragraphs: [
            'Data is the real reason. A prompt to a hosted model is processed by that provider under their terms. A prompt to a local model is not sent anywhere, which is the only version of that guarantee that does not depend on someone else’s policy.',
            'It also removes per-token billing, rate limits, and the possibility of a model being retired underneath you. A model you have downloaded keeps working.',
          ],
        },
        {
          id: 'the-cost-shape',
          heading: 'The cost shape, not the cost',
          paragraphs: [
            'Local AI is not automatically cheaper. It converts a variable cost into a fixed one: you buy or rent hardware, and then inference is close to free at the margin.',
            'That is a good trade at high, steady volume and a bad one for occasional use. A GPU idling most of the day is more expensive than the API calls it replaced.',
          ],
        },
        {
          id: 'the-honest-limits',
          heading: 'The honest limits',
          paragraphs: [
            'Models that run comfortably on a single machine are generally not the largest models available. On the hardest reasoning tasks the gap between a local model and a frontier hosted model is real.',
            'For a great many everyday tasks — summarising, drafting, extracting, classifying, routine code — the gap is much smaller than people assume, and the privacy and cost properties often matter more than the last increment of capability.',
          ],
        },
        {
          id: 'hybrid',
          heading: 'Most useful as a hybrid',
          paragraphs: [
            'The common pattern is not local-only or cloud-only. It is local for anything sensitive or high-volume, hosted for the hardest questions, and a policy deciding which is which — which is exactly what a router is for.',
          ],
        },
      ],
      faq: [
        {
          question: 'What hardware do I need?',
          answer:
            'It depends entirely on model size and quantisation, and anyone who gives you a single number is guessing. The dominant constraint is available memory: the model’s weights have to fit, and what fits determines what you can run.',
        },
        {
          question: 'Is local AI private by definition?',
          answer:
            'The model call is. The rest of the application may not be — search, telemetry and other integrations can still reach outside. Privacy is a property of the whole system, not of one component.',
        },
        {
          question: 'Can local models use my documents?',
          answer:
            'Yes. Retrieval works the same way, and when both the retrieval and the model are local the documents never leave your hardware at any point.',
        },
      ],
      productNote:
        'ClawAI runs local models through Ollama and llama.cpp, and its local-only routing mode keeps the whole fallback chain on local providers rather than reaching for a cloud model.',
    },
    [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]: {
      seo: {
        title: 'What are open-weight models?',
        description:
          'Open-weight models publish their trained parameters so you can run them yourself. What "open" covers, what it does not, and why licences differ so much.',
        keywords: ['open weight models', 'open source LLM', 'downloadable models'],
      },
      eyebrow: 'Local and private',
      title: 'What are open-weight models?',
      summary:
        'An open-weight model is one whose trained parameters are published, so you can download and run it on your own hardware. It is a precise term, and it is deliberately narrower than "open source" — the weights being available says nothing about the training data, the code, or what the licence lets you do.',
      sections: [
        {
          id: 'what-open-covers',
          heading: 'What "open" covers here',
          paragraphs: [
            'Open weights means the numbers that constitute the trained model are downloadable. That is enough to run it, fine-tune it, inspect it, and keep it working regardless of what the publisher does later.',
            'It usually does not include the training data, and often does not include the training code. So an open-weight model is reproducible in the sense that you can run it, not in the sense that you could rebuild it.',
          ],
        },
        {
          id: 'licences',
          heading: 'The licences genuinely differ',
          paragraphs: [
            'Some open-weight models carry ordinary permissive licences. Others carry conditions: restrictions on commercial use above a size threshold, prohibitions on particular applications, or requirements about attribution and derived models.',
            'This matters commercially and is easy to skip. "We can download it" and "we can use it in our product" are different questions, and only the licence answers the second.',
          ],
        },
        {
          id: 'why-they-matter',
          heading: 'Why they matter',
          paragraphs: [
            'They are the only models you can run entirely on your own hardware, which makes them the foundation of every local and private deployment. They also cannot be retired underneath you — a downloaded model works for as long as you keep it.',
            'The capability gap to the best hosted models is real and has narrowed considerably. For a large share of everyday work it is no longer the deciding factor.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is open-weight the same as open source?',
          answer:
            'No. Open source implies the source and the freedom to use and modify it. Open weight means the parameters are published, under whatever licence the publisher chose — which is sometimes restrictive.',
        },
        {
          question: 'Can I fine-tune an open-weight model?',
          answer:
            'Technically yes, that is one of the main reasons to want the weights. Whether you may, and what you may do with the result, is a licence question that varies by model.',
        },
        {
          question: 'Are they safe to use commercially?',
          answer:
            'Many are; some are not without conditions. Read the specific licence for the specific model — this is the one thing in this area that genuinely cannot be generalised.',
        },
      ],
      productNote:
        'ClawAI runs open-weight models through Ollama and llama.cpp on your own hardware, alongside {cloudProviderCount} cloud providers, with routing deciding which handles what.',
    },
    [LearnTopic.WHAT_IS_SELF_HOSTED_AI]: {
      seo: {
        title: 'What is self-hosted AI?',
        description:
          'Self-hosted AI means running the whole application yourself, not just the model. What it covers, what it demands operationally, and how it differs from local models.',
        keywords: ['self-hosted AI', 'on-premise AI platform', 'private deployment'],
      },
      eyebrow: 'Local and private',
      title: 'What is self-hosted AI?',
      summary:
        'Self-hosting means the application runs on infrastructure you control — the interface, the databases, the queues, the orchestration — not only the model. It is a bigger commitment than running a local model, and it answers a different question: not just "where does inference happen" but "who holds the data at rest".',
      sections: [
        {
          id: 'more-than-the-model',
          heading: 'It is more than the model',
          paragraphs: [
            'Running a local model still leaves conversations, files, memory and account data in whatever application you used. Self-hosting moves all of that onto your own infrastructure.',
            'The distinction matters for anyone whose obligations are about stored data rather than about inference. Where the model runs and where the history lives are separate questions, and only self-hosting answers the second.',
          ],
        },
        {
          id: 'what-it-costs-you',
          heading: 'What it costs operationally',
          paragraphs: [
            'You take on upgrades, backups, monitoring, TLS, and the debugging when something breaks at an inconvenient hour. That is a real, ongoing cost measured in attention rather than money.',
            'It is worth it when the data genuinely cannot sit elsewhere, or when you need the deployment to outlive any vendor relationship. It is not worth it as a general precaution.',
          ],
        },
        {
          id: 'hybrid-is-normal',
          heading: 'Self-hosted does not mean disconnected',
          paragraphs: [
            'A self-hosted deployment can still call hosted models. Many do: the platform and its data are yours, and cloud providers are used where their capability is worth the data leaving.',
            'The combination that removes external processing entirely is self-hosting plus local models, and it is a deliberate configuration rather than the default.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is self-hosting the same as local AI?',
          answer:
            'No. Local AI is about where the model runs. Self-hosting is about where the application and its data live. You can have either without the other, and the strongest privacy position needs both.',
        },
        {
          question: 'Does self-hosting make us compliant?',
          answer:
            'No. It can be a component of a compliance story, but compliance is about contracts, controls, evidence and audits. Where the software runs is one input among many.',
        },
        {
          question: 'What does it take to run?',
          answer:
            'For most platforms, containers, a database, and somewhere to run them — plus a person who owns the upgrade path. The last part is the one that gets underestimated.',
        },
      ],
      productNote:
        'ClawAI runs on your own infrastructure — the full stack, not a hosted tier with a local option — and its source is available for technical review.',
    },
    [LearnTopic.OLLAMA_VS_LLAMACPP]: {
      seo: {
        title: 'Ollama vs llama.cpp: which should you use?',
        description:
          'Ollama and llama.cpp both run open-weight models locally. How they relate, what each one is good at, and why using both is normal.',
        keywords: ['Ollama vs llama.cpp', 'local model runtime', 'run LLM locally'],
      },
      eyebrow: 'Local and private',
      title: 'Ollama vs llama.cpp',
      summary:
        'These are not really competitors. llama.cpp is the inference engine that made running language models on ordinary hardware practical; Ollama is a model manager and server built on that lineage. The question is usually not which to pick but which layer you want to work at.',
      sections: [
        {
          id: 'what-each-is',
          heading: 'What each one is',
          paragraphs: [
            'llama.cpp is a C++ inference engine. It runs quantised models efficiently on CPUs and GPUs, and it exposes fine-grained control over how a model is loaded and executed. It is the lower layer, and much of the local-AI ecosystem is built on it.',
            'Ollama wraps that kind of engine in convenience: pull a model by name, run a server, get an HTTP API, have model files and memory managed for you. It optimises for getting a model running in a minute.',
          ],
        },
        {
          id: 'choosing',
          heading: 'How to choose',
          paragraphs: [
            'Choose Ollama when you want models running quickly with sane defaults, when you will switch between several models, or when you want a stable local API without tuning anything.',
            'Choose llama.cpp directly when you need control — specific quantisation, specific layer offloading, unusual hardware, or embedding inference into your own binary. The cost is that you manage the details yourself.',
          ],
        },
        {
          id: 'both',
          heading: 'Using both is normal',
          paragraphs: [
            'A common arrangement is Ollama for everyday interactive use and llama.cpp for a workload that has been tuned deliberately. They are not mutually exclusive, and a platform that supports both lets the decision be made per deployment rather than once.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is Ollama just a wrapper?',
          answer:
            'That undersells it. Model management, memory handling and a consistent API are the parts that make local models practical day to day, and they are genuine work regardless of what engine is underneath.',
        },
        {
          question: 'Which is faster?',
          answer:
            'On the same model, quantisation and hardware, they are close, because the heavy lifting is the same kind of work. Differences in practice usually come from configuration rather than from the tool.',
        },
        {
          question: 'What is quantisation?',
          answer:
            'Storing model weights at lower precision so they need less memory. It is what makes large models fit on ordinary hardware, and it trades a small amount of quality for a large amount of practicality.',
        },
      ],
      productNote:
        'ClawAI supports both as local runtimes, so a deployment can use Ollama’s convenience, llama.cpp’s control, or both at once.',
    },
    [LearnTopic.CLOUD_AI_VS_LOCAL_AI]: {
      seo: {
        title: 'Cloud AI vs local AI: how to choose',
        description:
          'Cloud models offer capability and no hardware; local models offer control and flat cost. The trade-offs that actually decide it, and why most teams use both.',
        keywords: ['cloud AI vs local AI', 'local vs hosted LLM', 'private AI deployment'],
      },
      eyebrow: 'Local and private',
      title: 'Cloud AI vs local AI',
      summary:
        'The honest summary: cloud models are more capable at the top end and require nothing of you; local models keep your data on your hardware and turn a variable bill into a fixed one. Almost nobody should choose one for everything, and the interesting question is where the line sits.',
      sections: [
        {
          id: 'capability',
          heading: 'Capability',
          paragraphs: [
            'The largest and strongest models are hosted, and on genuinely hard reasoning the difference is real. If your work is dominated by the hardest kind of question, that matters more than anything else on this page.',
            'For summarising, drafting, extraction, classification and routine code, the gap has narrowed enough that it is rarely the deciding factor.',
          ],
        },
        {
          id: 'data',
          heading: 'Data',
          paragraphs: [
            'This is usually what actually decides it. A prompt sent to a hosted model is processed by that provider under their terms. For most content that is fine. For some — regulated records, unreleased work, third-party confidential material — it is not, and no contractual assurance is as strong as the data not leaving.',
            'This is why the split is rarely all-or-nothing. It is usually decided per kind of data rather than per organisation.',
          ],
        },
        {
          id: 'cost',
          heading: 'Cost',
          paragraphs: [
            'Cloud is variable: no capital outlay, and a bill proportional to use that grows with success. Local is fixed: hardware up front, then near-zero marginal cost.',
            'The crossover depends on volume. Occasional use is cheaper hosted. Heavy, steady, predictable use is usually cheaper local, and the break-even arrives sooner than people expect once usage is continuous.',
          ],
        },
        {
          id: 'the-answer',
          heading: 'Most teams end up with both',
          paragraphs: [
            'Local for sensitive and high-volume work, hosted for the hardest questions, and a routing policy deciding per request. That requires a system where the decision is explicit and auditable — otherwise "we keep sensitive things local" is an intention rather than a control.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is local AI cheaper?',
          answer:
            'At sustained volume, usually. At low or bursty volume, usually not — idle hardware costs money whether or not you use it.',
        },
        {
          question: 'Can I start hosted and move later?',
          answer:
            'Yes, and it is a sensible order: prove the workflow with hosted models, then move the parts whose volume or sensitivity justifies hardware. That is much easier on a platform that already supports both.',
        },
        {
          question: 'Is hybrid complicated?',
          answer:
            'It is if you build it yourself, because you are maintaining two paths. It is straightforward if the routing layer already treats local and hosted models as interchangeable destinations.',
        },
      ],
      productNote:
        'ClawAI treats local and cloud models as the same kind of destination, and its privacy-first and local-only modes make "sensitive work stays local" a setting rather than a habit.',
    },
    [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: {
      seo: {
        title: 'AI agent vs AI chatbot: what is the difference?',
        description:
          'A chatbot answers; an agent acts. What changes when a model can use tools, why that raises the stakes, and what to check before letting one act.',
        keywords: ['AI agent vs chatbot', 'what is an AI agent', 'AI tool use'],
      },
      eyebrow: 'Foundations',
      title: 'AI agent vs AI chatbot',
      summary:
        'A chatbot produces text and you decide what to do with it. An agent is given tools and a goal, and takes steps on its own — reading files, calling APIs, running commands — until it thinks it is finished. The difference is not intelligence; it is whether the output is a suggestion or an action.',
      sections: [
        {
          id: 'the-difference',
          heading: 'The actual difference',
          paragraphs: [
            'The mechanism is tool use. An agent is a model in a loop with a set of tools it may call, and each result feeds the next decision. Remove the tools and the loop, and you have a chatbot.',
            'That loop is what makes agents useful and what makes them risky. A chatbot that is wrong wastes your time. An agent that is wrong has already done something.',
          ],
        },
        {
          id: 'what-agents-are-good-at',
          heading: 'Where agents earn their keep',
          paragraphs: [
            'Multi-step work with a checkable end state. Run the tests, read the failure, change the code, run them again. The check closes the loop, and the agent can tell whether it has succeeded.',
            'They struggle where success is a matter of judgement, because nothing tells them to stop. An agent with no way to verify its own progress will keep going confidently.',
          ],
        },
        {
          id: 'what-to-check',
          heading: 'What to check before letting one act',
          paragraphs: [
            'What tools it has, and what those tools can reach. Whether destructive actions need approval. Whether you can see the steps it took, not just the result. And whether it can be stopped mid-run.',
            'The steps matter most. An agent whose reasoning you cannot inspect is one you have to accept or reject wholesale, which is the worst position to review work from.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is a chatbot with search an agent?',
          answer:
            'It is the boundary. Once it decides for itself whether to search, and what to do with the results, it has the loop. Most useful assistants now sit somewhere on this spectrum rather than at one end.',
        },
        {
          question: 'Do agents need the strongest models?',
          answer:
            'They benefit more than chatbots do, because errors compound across steps. A small mistake early can send the whole run somewhere useless.',
        },
        {
          question: 'Are agents safe to run on a codebase?',
          answer:
            'With version control, scoped permissions and a review step, yes — that is a well-established use. Without those, an agent is making unreviewed changes to your work.',
        },
      ],
      productNote:
        'ClawAI’s coding agent runs in your editor with the steps visible and the model choice yours, so a run is reviewable rather than a single take-it-or-leave-it result.',
    },
  },
};
