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
      [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]:
        'How a prompt becomes tokens, probabilities and one generated answer.',
      [LearnTopic.WHAT_ARE_AI_TOKENS]:
        'The unit a model actually reads and writes, and why an exact count needs its own tokenizer.',
      [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]:
        'What temperature and top-p actually change about an answer — and what they can’t change.',
      [LearnTopic.WHAT_ARE_EMBEDDINGS]:
        'How text becomes a vector of numbers, and why that is what makes search by meaning possible.',
      [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]:
        'Three different fixes for three different problems, and why many products never need the third.',
      [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]:
        'The model never runs anything — it proposes a call, and your application decides what happens next.',
      [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]:
        'Asking a model for JSON is a request; only some mechanisms actually guarantee it matches your schema.',
      [LearnTopic.WHY_AI_HALLUCINATES]:
        'Why a model states a wrong answer with the same confidence as a right one — and what actually reduces it.',
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
      [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]:
        'What to actually test before trusting a model with your work — not a leaderboard number.',
      [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]:
        'What a benchmark number actually measures, and the ways it can mislead you before you even start testing.',
      [LearnTopic.WHAT_IS_PROMPT_INJECTION]:
        'Text that isn’t from you can still give the model instructions — what that means and why it can’t be fully solved by a smarter model.',
    },
  },
  topics: {
    [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]: {
      seo: {
        title: 'How do language models generate answers?',
        description:
          'Learn how language models turn text into tokens, predict the next token from context, sample an answer, and why fluent output can still be wrong.',
        keywords: ['how language models work', 'next token prediction', 'LLM token generation'],
      },
      eyebrow: 'Foundations',
      title: 'How language models generate answers',
      summary:
        'A language model generates an answer one token at a time. It converts the prompt into tokens, uses the tokens in its current context to assign probabilities to possible next tokens, chooses one, appends it, and repeats. The result can look deliberate, but it is generated from learned statistical patterns rather than retrieved as a finished record.',
      sections: [
        {
          id: 'tokenization',
          heading: 'Text enters as tokens',
          paragraphs: [
            'Before generation begins, a tokenizer splits the instructions, conversation, tool results and other supplied context into tokens. A token may be a whole word, part of a word, punctuation or another text fragment. The model processes token identifiers, not sentences as people see them, so spelling, formatting and language can change how much context a prompt consumes.',
          ],
        },
        {
          id: 'next-token-prediction',
          heading: 'The model predicts one next token',
          paragraphs: [
            'For the tokens seen so far, the network assigns a probability to each possible next token in its vocabulary. A decoding rule selects one token, adds it to the sequence and runs the prediction again. This loop continues until a stop token, a configured limit or another stopping condition is reached; the model does not normally fetch a complete answer that was stored in advance.',
          ],
        },
        {
          id: 'context-and-probability',
          heading: 'Context shapes the probabilities',
          paragraphs: [
            'System instructions, the user request, earlier messages and supplied documents all shift the next-token probabilities, but only while they fit in the active context. Decoding also matters: choosing the highest-probability token tends to be more repeatable, while sampling among plausible tokens can produce varied wording. Temperature and related controls change that selection process; they do not add facts or understanding.',
          ],
        },
        {
          id: 'not-database-retrieval',
          heading: 'Generation is not database retrieval',
          paragraphs: [
            'Training changes many distributed numerical weights so that patterns in text influence later predictions. Those weights are not a catalogue of source passages with reliable addresses. Unless a system separately retrieves documents or calls a tool, the model cannot look up a source record and prove where a statement came from. A fluent answer can therefore combine familiar patterns into a claim that has no factual support.',
          ],
        },
        {
          id: 'practical-limitations',
          heading: 'Practical limits to plan around',
          paragraphs: [
            'Models can invent details, follow an ambiguous instruction in an unintended way, miss information outside the context, repeat bias in their training material and make errors in calculation or multi-step reasoning. Treat important output as a draft: provide relevant context, request structured evidence, use retrieval or tools when current facts matter, and verify consequential claims against an independent source or test.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does a language model understand its answer?',
          answer:
            'It can represent complex relationships and produce useful reasoning-like text, but describing that as human understanding adds assumptions the mechanism does not establish. Operationally, it is predicting tokens from learned parameters and the current context.',
        },
        {
          question: 'Why can the same prompt produce different answers?',
          answer:
            'When decoding samples from several plausible next tokens, an early different choice changes every probability that follows. Deterministic settings reduce variation, but they do not guarantee that the repeated answer is correct.',
        },
        {
          question: 'Can a model quote its sources?',
          answer:
            'Only when sources are supplied through context, retrieval or a tool and the system preserves that connection. A citation generated from model weights alone may look convincing and still be invented, so verify it before relying on it.',
        },
      ],
      productNote:
        'ClawAI routes prompts to configured cloud or local models and can run comparison and verification workflows; the selected model still generates tokens probabilistically, so routing alone is not a guarantee of truth.',
    },
    [LearnTopic.WHAT_ARE_AI_TOKENS]: {
      seo: {
        title: 'What are AI tokens?',
        description:
          'Tokens are the units a language model actually reads and writes, not words or characters. How tokenization works, how input and output are counted, and why only the model’s own tokenizer gives an exact number.',
        keywords: ['what is an AI token', 'LLM tokenization', 'input and output tokens'],
      },
      eyebrow: 'Foundations',
      title: 'What are AI tokens?',
      summary:
        'A token is the unit a language model actually reads and writes: a fragment of text produced by splitting your input with that model’s own tokenizer. It is not a word and not a character, and how many tokens a piece of text produces depends on the language it is written in, how it is formatted, and which model’s tokenizer is doing the counting.',
      sections: [
        {
          id: 'tokens-vs-words-and-characters',
          heading: 'A token is not a word, and not a character',
          paragraphs: [
            'A tokenizer breaks text into pieces drawn from a fixed vocabulary it learned during training. A common short word is often exactly one token; a longer or rarer word can split into two or three; a single unusual symbol can itself take more than one token. Punctuation, spaces and line breaks are tokens too, not free.',
            'This is why token count, word count and character count move independently of one another. Two sentences with the same number of words can use a different number of tokens, and rewriting a sentence to use shorter, more common words can shrink its token count without shortening it as text.',
          ],
        },
        {
          id: 'tokenization-differs-by-language-and-model',
          heading: 'Tokenization differs by language and by model',
          paragraphs: [
            'Every model ships with its own tokenizer and its own fixed vocabulary, built from the text it was trained on. Wording that was common in that training text tends to compress into fewer, longer tokens; wording that was rare tends to split into more, shorter pieces.',
            'Two consequences follow directly. First, the same sentence can cost a noticeably different number of tokens depending on the language it is written in, because no two languages are represented the same way in a given vocabulary. Second, the same sentence can cost a different number of tokens on two different models, because each has its own vocabulary — a count from one model’s tokenizer is not a reliable estimate for another.',
          ],
        },
        {
          id: 'input-and-output-tokens',
          heading: 'A request spends input tokens and output tokens',
          paragraphs: [
            'Every request has two token pools, counted and usually priced separately. Input tokens are everything sent to the model: instructions, the visible conversation, any attached documents and tool results. Output tokens are everything the model generates in return.',
            'Input tokens are not a one-time cost in a multi-turn conversation. Because each new request resends the conversation so far, prior messages and any attached material are counted again as input on every turn, not only on the turn where they were first added.',
          ],
        },
        {
          id: 'tokens-and-the-context-window',
          heading: 'Tokens are the unit a context window is measured in',
          paragraphs: [
            'A context window is a budget expressed in tokens, shared by the input and the output of a single request. See what a context window is for how that budget behaves in practice; what matters here is only the unit — the window is not measured in words, characters or messages, it is measured in tokens, and input and output draw from the same total.',
          ],
        },
        {
          id: 'estimating-cost-without-a-price-table',
          heading: 'Estimating cost without a fixed number',
          paragraphs: [
            'Token-based cost is a multiplication: tokens used times a rate set per model. Providers set and change those rates on their own schedule, and a more capable model is typically priced higher per token than a smaller one, with output tokens usually costed at a higher rate than input tokens. None of that makes a specific figure worth publishing here — a rate printed on this page would be wrong within months.',
            'What stays true regardless of the current rate table is the shape of the cost: shorter, more focused prompts and shorter, more focused answers use fewer tokens, and re-sending large attachments on every turn of a long conversation is one of the more common ways token usage grows without anyone deciding it should.',
          ],
        },
        {
          id: 'exact-counts-need-the-tokenizer',
          heading: 'An exact count needs the model’s own tokenizer',
          paragraphs: [
            'A rule of thumb about tokens per word is an approximation of one language processed by one tokenizer, and it does not transfer to another language, another script or another model. Formatting changes the count too: code, JSON and heavily punctuated text tend to tokenize less efficiently than the same information written as plain prose.',
            'If an exact count matters — because a request is near a context limit, or because cost needs to be predicted precisely — the only reliable method is to run the actual text through the specific model’s own tokenizer or counting endpoint before sending it. An estimate based on words or characters is a guess dressed up as a number.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is a token the same thing as a word?',
          answer:
            'No. A short, common word is often one token, but a longer or rarer word can split into several, and punctuation, spaces and line breaks are counted as tokens in their own right. Token count and word count track each other loosely at best.',
        },
        {
          question:
            'Why does the same sentence use a different number of tokens in different tools?',
          answer:
            'Each tool is usually reporting the count from a specific model’s tokenizer, and every model has its own vocabulary built from its own training text. A count that is accurate for one model’s tokenizer is only an estimate for another.',
        },
        {
          question: 'Does formatting like code or JSON use more tokens than plain text?',
          answer:
            'Often, yes. Indentation, punctuation and repeated symbols are themselves tokens, so a heavily structured format can use noticeably more tokens than the same information written as plain sentences.',
        },
        {
          question: 'How can I find the exact token count for a request before sending it?',
          answer:
            'Run the exact text through the specific model’s own tokenizer or a counting endpoint it provides. Any estimate based on word count or character count is approximate, and the error grows with language, script and formatting differences.',
        },
      ],
      productNote:
        'ClawAI counts the input and output tokens a request actually used once the response is generated, and shows the cost and allowance it drew against that answer rather than an estimate made in advance.',
    },
    [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]: {
      seo: {
        title: 'What do temperature and top-p control?',
        description:
          'Temperature and top-p decide how a model picks its next token, not what it knows. What each setting actually changes, why lower is not automatically better, and why temperature zero still is not perfectly repeatable.',
        keywords: [
          'temperature top-p explained',
          'LLM sampling parameters',
          'AI output randomness',
        ],
      },
      eyebrow: 'Foundations',
      title: 'What do temperature and top-p control?',
      summary:
        'Temperature and top-p are decoding settings that change how a model chooses its next token from the probabilities it has already computed. They control randomness in wording and phrasing, not accuracy, knowledge, or reasoning ability — and neither one guarantees exactly repeatable output, even at its most conservative setting.',
      sections: [
        {
          id: 'what-these-settings-actually-change',
          heading: 'They reshape a choice, not the model’s knowledge',
          paragraphs: [
            'By the time temperature or top-p apply, the model has already computed a probability for every possible next token given the current context. Neither setting changes where those probabilities came from — the model’s learned parameters and the context it was given. They only change how one token gets picked from the distribution the model already produced.',
          ],
        },
        {
          id: 'temperature-and-the-shape-of-the-distribution',
          heading: 'Temperature adjusts how sharp or flat that distribution is',
          paragraphs: [
            'A lower temperature makes the highest-probability tokens even more likely to be picked, so output leans toward the single most probable continuation and repeats itself more across separate runs. A higher temperature flattens the distribution, giving lower-probability tokens a more realistic chance of being chosen, which produces more varied wording — and more room for an unlikely, sometimes odd, token to slip through.',
            'Temperature does not add information the model does not have. It cannot turn a wrong guess into a correct one; it only changes how strongly the model commits to whichever guess it already favors.',
          ],
        },
        {
          id: 'top-p-and-the-candidate-pool',
          heading: 'Top-p limits which tokens even get considered',
          paragraphs: [
            'Top-p, also called nucleus sampling, works differently from temperature: instead of reshaping every probability, it first narrows the field to the smallest set of top tokens whose probabilities add up to a chosen threshold, then samples only from that set. A low top-p keeps only the handful of tokens the model is most confident about; a high top-p lets in a wider spread of plausible alternatives. Temperature and top-p are typically applied together, one after the other, rather than as substitutes for each other.',
          ],
        },
        {
          id: 'why-temperature-zero-is-not-perfectly-repeatable',
          heading: 'Temperature zero is close to deterministic, not exactly deterministic',
          paragraphs: [
            'A temperature of zero, or an equivalent “always pick the most likely token” setting, removes the sampling step and should, in principle, make output reproducible for identical input. In practice, floating-point arithmetic on GPUs is not strictly order-independent, and provider infrastructure can batch or otherwise reorder computation between requests. The result is that the same prompt sent twice at the most deterministic setting can still occasionally come back different, especially when two candidate tokens were nearly tied.',
          ],
        },
        {
          id: 'lower-is-not-the-same-as-better',
          heading: 'A lower setting is not automatically a better one',
          paragraphs: [
            'Reducing randomness makes output more repeatable, not more correct. A confidently wrong continuation stays confidently wrong at low temperature, and very low settings can also produce noticeably repetitive or stilted phrasing over longer output, because the model keeps re-selecting the same safe, high-probability tokens.',
          ],
        },
        {
          id: 'choosing-a-setting-for-the-task',
          heading: 'The right setting depends on what the output is for',
          paragraphs: [
            'Tasks with essentially one correct answer — extracting a value, following a strict format, writing code that has to compile — generally benefit from lower randomness, because consistency matters more than variety. Tasks where several different answers could all be good — brainstorming, drafting alternative phrasings, open-ended writing — benefit from more randomness, because variety is the point. Neither setting substitutes for giving the model better context, and neither one substitutes for verifying an answer that actually matters.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does temperature zero make output deterministic?',
          answer:
            'Nearly, but not guaranteed. It removes the intentional randomness of sampling, but floating-point computation and provider-side batching can still occasionally produce a different token on an exact tie or a very close call, so identical requests are usually — not always — identical.',
        },
        {
          question: 'What is the difference between temperature and top-p?',
          answer:
            'Temperature reshapes the probability of every possible next token. Top-p first narrows the field to the smallest set of top candidates whose probabilities cross a threshold, then samples from just that set. They act on the same distribution in different ways and are commonly combined.',
        },
        {
          question: 'Does a higher temperature make a model more creative or more knowledgeable?',
          answer:
            'It changes wording variety, not knowledge or reasoning. A higher temperature can produce more varied phrasing, but it still draws from the same learned parameters, and can just as easily surface a less likely, lower-quality continuation.',
        },
        {
          question: 'Should I always use the lowest setting for factual tasks?',
          answer:
            'A lower setting makes output more consistent, which helps when consistency itself is the goal, but it does not fix an underlying wrong answer — a low-temperature output can be confidently and repeatably incorrect. Verifying a factual claim still requires an independent source or check.',
        },
      ],
      productNote:
        'ClawAI exposes a temperature control per conversation, applied to whichever provider handles the request; it does not expose top-p as a setting, so nucleus sampling stays at each provider’s own default.',
    },
    [LearnTopic.WHAT_ARE_EMBEDDINGS]: {
      seo: {
        title: 'What are embeddings?',
        description:
          'An embedding turns text into a vector of numbers that represents its meaning, which is what makes searching by meaning rather than exact wording possible. How similarity is measured, and why embeddings from different models don’t mix.',
        keywords: [
          'what is an embedding',
          'vector embeddings explained',
          'semantic search meaning',
        ],
      },
      eyebrow: 'Foundations',
      title: 'What are embeddings?',
      summary:
        'An embedding is a list of numbers, produced by an embedding model, that represents the meaning of a piece of text as a position in a high-dimensional space. Text with similar meaning ends up with vectors that are close together, which is the property that makes searching or matching by meaning — rather than by exact wording — possible in the first place.',
      sections: [
        {
          id: 'what-an-embedding-actually-is',
          heading: 'A list of numbers standing in for meaning',
          paragraphs: [
            'An embedding model reads a piece of text — a word, a sentence, a paragraph, sometimes a whole document — and outputs a fixed-length vector: an ordered list of numbers, typically hundreds or thousands long. That vector is not a summary or a compression of the text a person could read; it is a position in a mathematical space that the model learned during training, arranged so that texts with related meaning sit near each other.',
          ],
        },
        {
          id: 'why-similar-meaning-lands-nearby',
          heading: 'Similar meaning lands nearby, not similar spelling',
          paragraphs: [
            'Two sentences that share almost no words but mean roughly the same thing can produce vectors that are close together, because the embedding model learned associations between concepts during training, not just which letters appear. Conversely, two sentences that share many of the same words but mean different things can end up far apart. This is the core difference between embedding-based search and matching on exact keywords.',
          ],
        },
        {
          id: 'how-similarity-is-measured',
          heading: 'Closeness is measured, not eyeballed',
          paragraphs: [
            'Once text is represented as vectors, comparing meaning becomes a geometry problem: a similarity score computed between two vectors, most commonly by how closely they point in the same direction. Searching a large collection means computing that score between a query vector and every stored vector, then returning the closest matches — the same operation whether the collection has a hundred entries or a hundred million.',
          ],
        },
        {
          id: 'embeddings-are-model-specific',
          heading: 'Embeddings from different models don’t mix',
          paragraphs: [
            'Like a tokenizer’s vocabulary, an embedding model’s vector space is specific to that model and how it was trained. A vector produced by one embedding model is not meaningfully comparable to a vector produced by a different one, even if both vectors have the same number of dimensions. Switching embedding models means re-embedding everything already stored, not just the new content going forward.',
          ],
        },
        {
          id: 'not-the-same-job-as-a-language-model',
          heading: 'An embedding model’s job is different from a language model’s job',
          paragraphs: [
            'A language model generates text, one token at a time, from a prompt. An embedding model does not generate anything — it converts text into a vector and stops. Some systems use the same base model for both jobs, and some use two entirely separate models; either way, the vector output by an embedding step is not itself an answer, only something for a search or matching step to compare.',
          ],
        },
        {
          id: 'where-embeddings-show-up-in-practice',
          heading: 'Where this shows up in practice',
          paragraphs: [
            'Embeddings are what makes retrieval-augmented generation possible — see what RAG is for how retrieval fits together with a language model — but the same technique also underlies semantic search over support tickets or documentation, matching similar past conversations, deduplicating near-identical content, and clustering related items without anyone hand-labeling categories.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is an embedding the same thing as a token?',
          answer:
            'No. A token is a discrete unit of text a language model reads or writes one at a time. An embedding is a continuous vector representing the meaning of a larger piece of text, produced by a separate step that does not generate anything.',
        },
        {
          question: 'Can I compare embeddings produced by two different models?',
          answer:
            'Not meaningfully. Each embedding model defines its own vector space during training, so a distance that means “very similar” in one model’s space has no defined meaning in another model’s space, even with matching vector lengths.',
        },
        {
          question: 'Does a bigger embedding vector mean better search quality?',
          answer:
            'Not by itself. More dimensions can capture more nuance, but quality depends on what the model was trained on and how well that matches your content, not on dimension count alone.',
        },
        {
          question: 'Can someone recover the original text from an embedding?',
          answer:
            'Exact recovery is generally impractical, but an embedding is still derived directly from your content and can leak meaningful information about it under some attacks. Treat stored embeddings of sensitive text with the same care as the text itself, not as if they were already anonymized.',
        },
      ],
      productNote:
        'ClawAI’s memory and context-pack features generate embeddings locally through Ollama and store them in a vector database for similarity search, rather than sending your content to a separate cloud embeddings API for that purpose.',
    },
    [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]: {
      seo: {
        title: 'Prompting vs. RAG vs. fine-tuning: how do they differ?',
        description:
          'Three different ways to change what a model produces: better instructions, retrieved context, or a changed model. What each one actually fixes, what it can’t fix, and why many products never need the third.',
        keywords: [
          'prompting vs RAG vs fine-tuning',
          'when to fine-tune an LLM',
          'RAG versus fine-tuning',
        ],
      },
      eyebrow: 'Foundations',
      title: 'Prompting vs. RAG vs. fine-tuning: how do they differ?',
      summary:
        'Prompting, retrieval-augmented generation and fine-tuning are three different answers to the same underlying question: how do you get a model to produce what you actually need? Each one changes a different part of the system — the request, the context, or the model itself — and each one fixes a different kind of gap. Picking the wrong one for the problem you actually have is the most common reason a project stalls.',
      sections: [
        {
          id: 'three-different-fixes-for-three-different-problems',
          heading: 'Three different fixes for three different problems',
          paragraphs: [
            'Prompting changes what you tell the model for one request: instructions, examples, formatting rules. Retrieval-augmented generation, or RAG, changes what the model can see for one request by fetching relevant material and adding it to the context — see what RAG is for how that retrieval step works. Fine-tuning changes the model itself, adjusting its weights so a pattern is baked in and available without repeating it every time. They are not three difficulty levels of the same fix; they respond to three different kinds of gap.',
          ],
        },
        {
          id: 'prompting-changes-only-the-request',
          heading: 'Prompting changes only the request in front of you',
          paragraphs: [
            'A prompt is instructions, examples and constraints included with a single request. Nothing about it persists once the response comes back — the next request starts from the same blank state unless you include the same instructions again. This makes prompting the cheapest and fastest technique to iterate on: a wording change is testable in seconds, with no infrastructure and no retraining.',
            'Prompting is also the first thing worth exhausting before reaching for anything else. A surprising share of “the model doesn’t know how to do X” problems are actually “the instructions never said to do X” problems.',
          ],
        },
        {
          id: 'rag-adds-facts-without-touching-the-model',
          heading: 'RAG adds facts and documents without touching the model',
          paragraphs: [
            'RAG solves a different problem: information the model was never trained on, or information that changes too often for training to keep up with — your own documents, current records, anything private. Instead of teaching the model that information, a retrieval step finds relevant passages and puts them directly into the request as context, using embeddings to search by meaning rather than exact wording — see what embeddings are for how that search works underneath.',
            'Because nothing about the model changes, updating the underlying documents updates what the system can answer immediately, with no retraining step. The trade-off is that answer quality is bounded by retrieval quality: if the right passage is never found, the model cannot use information it was never shown.',
          ],
        },
        {
          id: 'fine-tuning-changes-the-model-itself',
          heading: 'Fine-tuning changes the model itself',
          paragraphs: [
            'Fine-tuning adjusts a model’s weights using additional training examples, so a pattern of behavior — a tone, a response format, a specialized skill demonstrated in the examples — becomes part of the model rather than something you have to restate in every prompt or supply through retrieval. Once trained, the model behaves that way by default, on any request, without extra instructions attached.',
            'It also has real costs that prompting and RAG do not: training examples have to be prepared and curated, a training run has to be run and evaluated, and the result is a specific model artifact that has to be hosted and kept in sync as base models improve. Fine-tuning does not add live or changing facts either — it bakes in a pattern from a fixed training set, and it goes stale the same way any static training does.',
          ],
        },
        {
          id: 'matching-the-technique-to-the-failure',
          heading: 'Match the technique to the actual failure, not the fanciest option',
          paragraphs: [
            'Wrong tone, wrong format, missed instructions: usually a prompting problem. Wrong or missing facts, especially about your own or fast-changing material: usually a retrieval problem. A specialized behavior you want applied consistently, on every request, without re-explaining it each time: the case fine-tuning is actually built for. These are not mutually exclusive — a fine-tuned model can still be prompted and given retrieved context — but each one only fixes the failure it is built for, and using the wrong one leaves the actual problem unsolved while adding cost and complexity.',
          ],
        },
        {
          id: 'why-many-products-skip-fine-tuning',
          heading: 'Why many products never reach for fine-tuning at all',
          paragraphs: [
            'Prompting and RAG both leave the underlying model untouched, so upgrading to a newer or better base model is mostly a configuration change. A fine-tuned model is tied to the base model it was trained from — a meaningful base-model upgrade usually means re-preparing data and retraining rather than simply switching. For that reason, many products solve their entire problem with prompting plus retrieval, and reach for fine-tuning only when a specific, well-defined behavior needs to be consistent across an enormous volume of requests without the cost of repeating instructions and context every time.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does RAG update the model’s knowledge permanently?',
          answer:
            'No. RAG changes what is included in the context of one request; the underlying model is never modified. The next request that does not retrieve the same material starts without it, exactly like any other prompt.',
        },
        {
          question: 'Is fine-tuning always more accurate than prompting or RAG?',
          answer:
            'No. Fine-tuning bakes in a pattern from its training examples, but it does not add facts absent from that training data, and it does not keep facts current the way retrieval can. A fine-tuned model can still be confidently wrong about anything outside what it was trained on.',
        },
        {
          question: 'Can prompting, RAG and fine-tuning be combined?',
          answer:
            'Yes. They change different parts of the system, so a fine-tuned model can still receive retrieved context and explicit instructions in the same request. Combining them is common; treating them as mutually exclusive choices is not necessary.',
        },
        {
          question: 'Which one should I try first?',
          answer:
            'Prompting, almost always. It requires no infrastructure and a wording change can be tested in seconds. Move to retrieval when the gap is missing or outdated information, and consider fine-tuning only once a specific, well-defined behavior needs to be consistent across a volume of requests large enough to justify the training and maintenance cost.',
        },
      ],
      productNote:
        'ClawAI’s context packs and file and workspace retrieval add relevant material to a request without touching the underlying model; ClawAI does not provide model fine-tuning — the cloud and local models it routes to are used as already trained.',
    },
    [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]: {
      seo: {
        title: 'How does AI tool calling actually work?',
        description:
          'A model that calls a tool never runs anything itself — it proposes a name and arguments, and your application decides whether to execute the call. How the request-response loop works, and why the proposal is a guess, not a guarantee.',
        keywords: [
          'how tool calling works',
          'LLM function calling explained',
          'AI tool use mechanism',
        ],
      },
      eyebrow: 'Foundations',
      title: 'How does AI tool calling actually work?',
      summary:
        'Tool calling, sometimes called function calling, lets a model ask for something to be done on its behalf: search a database, call an API, run a calculation. The part that surprises people is what the model actually does at that moment — it does not run anything. It outputs a structured request naming a tool and its arguments, and your application decides whether, and how, to act on it.',
      sections: [
        {
          id: 'what-tool-calling-actually-is',
          heading: 'The model is given a menu, not a keyboard',
          paragraphs: [
            'Before a request is sent, the application describes the tools available to the model: a name, a description of what each one does, and a schema for the arguments it expects. The model does not receive working code or a live connection to anything — it receives a description, the same way a person reads a menu without having access to the kitchen.',
          ],
        },
        {
          id: 'the-model-never-executes-anything',
          heading: 'The model never executes anything itself',
          paragraphs: [
            'When a model decides a tool would help, it produces a structured output — typically a tool name and a set of arguments — and stops there. Nothing has been searched, called, or changed yet. The application that sent the request reads that structured output, decides whether to act on it, and if so, runs the real function or API call on its own infrastructure.',
          ],
        },
        {
          id: 'the-loop-request-response-continue',
          heading: 'A full exchange is a loop, not a single step',
          paragraphs: [
            'The typical sequence is: the application sends a prompt plus the list of available tools; the model responds with either an answer or a proposed tool call; if it is a tool call, the application executes it and sends the result back as part of the conversation; the model then continues, often producing a final answer that uses that result. Multi-step tasks can repeat this loop several times before a response reaches the user.',
          ],
        },
        {
          id: 'a-proposed-call-is-a-guess-not-a-guarantee',
          heading: 'A proposed call is a plausible guess, not a guaranteed correct one',
          paragraphs: [
            'A model can propose the wrong tool, invent an argument that was never in the schema, or call a tool when nothing needed calling at all — the same probabilistic generation that produces any other output produces a tool call. Nothing about the mechanism makes a proposed call inherently safe to run. An application that executes arguments without validating them against the schema, and without authorizing what the call is actually allowed to touch, is trusting a guess with real access.',
          ],
        },
        {
          id: 'the-schema-is-the-interface-the-model-sees',
          heading: 'The schema is the only interface the model actually sees',
          paragraphs: [
            'A tool’s name, description and argument schema are the entire specification the model has to work from — it has no other way to learn what a tool does or how to fill in its parameters correctly. The same underlying function described clearly and narrowly tends to get called correctly far more often than one described vaguely or bundled with unrelated options, because the model is choosing and filling arguments from that description alone.',
          ],
        },
        {
          id: 'why-this-differs-from-the-model-writing-code',
          heading: 'Why this is different from asking a model to write code',
          paragraphs: [
            'Asking a model to produce a working script and asking it to call a predefined tool are not the same request. A tool call is constrained to a name and arguments your application already knows how to handle safely; free-form generated code can attempt to do anything the environment running it allows, which is a much larger and different problem to secure. Tool calling narrows what a model can ask for to a fixed, inspectable set of options.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does the model run the tool itself?',
          answer:
            'No. The model outputs a structured request naming a tool and its arguments. The application that sent the request decides whether to execute it, and the actual function or API call runs on the application’s own infrastructure, not inside the model.',
        },
        {
          question: 'Can a model call a tool with made-up arguments?',
          answer:
            'Yes. A model can supply a value that was never part of the schema, or that does not make sense for the tool, because the call is generated the same way any other output is. Validating arguments before executing anything real is the application’s responsibility, not something the model guarantees.',
        },
        {
          question: 'What happens if the model calls the wrong tool?',
          answer:
            'That depends entirely on how the application is built. A well-built one checks whether the call makes sense before executing it and can return an error or a clarifying result back to the model rather than acting on a mismatched request; a poorly built one executes whatever it receives.',
        },
        {
          question: 'Is tool calling the same thing as an AI agent?',
          answer:
            'No, but agents are usually built on top of it. Tool calling is the underlying request-response mechanism; an agent typically repeats that loop multiple times, with additional logic deciding what to try next based on each result.',
        },
      ],
      productNote:
        'ClawAI exposes workspace connectors and other actions to models as callable tools during a chat request; a proposed call is validated against its schema before ClawAI executes anything against a real connector on your behalf.',
    },
    [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]: {
      seo: {
        title: 'What are structured AI outputs?',
        description:
          'Asking a model to answer in JSON is a request, not a guarantee — the response can still come back malformed. What actually constrains a model’s output, why some mechanisms enforce it and others just ask, and why validation still matters either way.',
        keywords: [
          'what are structured outputs',
          'LLM JSON mode explained',
          'schema-constrained AI generation',
        ],
      },
      eyebrow: 'Foundations',
      title: 'What are structured AI outputs?',
      summary:
        'A structured output is a model response shaped to fit a specific format — usually JSON matching a defined schema — instead of free-form prose, so code can parse it without guessing. The part that surprises people is that “ask the model to return JSON” and “the model is guaranteed to return valid JSON” are two different claims, and only some mechanisms actually deliver the second one.',
      sections: [
        {
          id: 'what-structured-output-means',
          heading: 'Structure means downstream code can rely on the shape',
          paragraphs: [
            'A structured output constrains a response to a defined shape — a fixed set of fields, specific types, an enum of allowed values — rather than a paragraph of prose. The point is not style; it is that a program reading the response can pull out a value at a known path instead of parsing sentences and guessing at meaning.',
          ],
        },
        {
          id: 'two-ways-to-ask-for-structure',
          heading: 'There are two different ways to ask for it',
          paragraphs: [
            'The first is prompt-based: instructions tell the model to respond only in JSON matching a described shape. This works with essentially any model and needs no special API support, but it is a request the model can still ignore, get partly wrong, or wrap in explanatory text you did not ask for. The second is provider-enforced: some providers offer a mode, often called structured outputs or JSON mode, where generation itself is constrained so that only tokens consistent with the schema can be produced at each step. This is a stronger mechanism than an instruction, not just a stricter-sounding one — and it is a distinct feature from tool calling (see how tool calling works), which shapes the arguments to a named function rather than the model’s own answer.',
          ],
        },
        {
          id: 'a-prompt-instruction-is-a-request-not-a-guarantee',
          heading: 'A prompt instruction is a request, not a guarantee',
          paragraphs: [
            'When structure comes only from prompt wording, the model can still produce output that does not match — an extra field, a missing one, prose before the JSON, a value of the wrong type. Any system relying on prompt-only structure needs a real plan for what happens when parsing fails, not an assumption that it never will.',
          ],
        },
        {
          id: 'provider-enforced-output-is-a-different-guarantee',
          heading: 'Provider-enforced structure is a different kind of guarantee',
          paragraphs: [
            'Where a provider constrains generation directly against a schema, the output is far more reliably well-formed, because malformed tokens are excluded from being generated in the first place rather than merely discouraged. Exactly which providers and models support this, and how strictly, varies and changes over time — treat prompt-based structure and provider-enforced structure as different reliability tiers, not interchangeable ways to get the same result.',
          ],
        },
        {
          id: 'schema-design-still-affects-quality',
          heading: 'A valid shape is not the same as a correct answer',
          paragraphs: [
            'Even with the strongest enforcement, the schema only constrains form, not meaning. A summary field can be syntactically valid JSON and still contain three rambling sentences instead of one, or a confidently wrong number in a field labeled as a count. A vague or overly permissive schema tends to produce technically valid output that is still unreliable to use.',
          ],
        },
        {
          id: 'validate-before-you-trust-it',
          heading: 'Parsing successfully is not the same as being safe to trust',
          paragraphs: [
            'Whether structure came from a prompt or from provider enforcement, successfully parsing a response only confirms the shape was followed — it says nothing about whether field values are accurate, in range, or sensible. Treating a parsed object as verified data, rather than as a claim to check, is where structured-output systems most often go wrong in production.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is a structured output the same thing as a tool call?',
          answer:
            'No. Tool calling proposes a named function and its arguments for your application to potentially execute; a structured output shapes the model’s own answer into a defined format. The two mechanisms can be used independently or together.',
        },
        {
          question: 'Does asking a model for JSON in the prompt guarantee valid JSON back?',
          answer:
            'No. It is a request the model can still get wrong — extra text, a missing field, an incorrect type. Systems that rely only on prompt wording need a defined fallback for when parsing fails, not an assumption that it always succeeds.',
        },
        {
          question: 'If a provider enforces a schema, is the result guaranteed correct?',
          answer:
            'It is guaranteed to be well-formed according to the schema — the right fields, the right types. It is not guaranteed that the values inside those fields are accurate or sensible; enforcement constrains shape, not truth.',
        },
        {
          question: 'Do I still need to validate a structured response before using it?',
          answer:
            'Yes. Successfully parsing a response confirms the shape matched, not that the content is correct. Range checks, type checks, and sanity checks on the values remain necessary regardless of how the structure was produced.',
        },
      ],
      productNote:
        'ClawAI’s judge feature asks a model for a specific JSON shape through prompt instructions and falls back to a defined “parse failed” state rather than guessing when a response doesn’t match — a direct, working example that a schema requested in a prompt is a request, not a guarantee.',
    },
    [LearnTopic.WHY_AI_HALLUCINATES]: {
      seo: {
        title: 'Why does AI hallucinate?',
        description:
          'A language model states a wrong answer with the exact same confident tone as a right one, because it was never trained to know what it doesn’t know. Why hallucination happens, why it can’t be fully removed, and what actually reduces it.',
        keywords: ['why does AI hallucinate', 'LLM hallucination explained', 'AI making things up'],
      },
      eyebrow: 'Foundations',
      title: 'Why does AI hallucinate?',
      summary:
        'A hallucination is a model stating something false as if it were fact, with no hedge and no signal that it is guessing. It happens because a language model is trained to produce the most statistically likely next token, not to check a claim against the world — so a fluent, confident, wrong sentence and a fluent, confident, right one are generated by exactly the same process.',
      sections: [
        {
          id: 'a-confident-wrong-answer-not-a-crash',
          heading: 'It is a confident wrong answer, not an error the model can flag',
          paragraphs: [
            'A model doesn’t have a separate "I don’t know" mode it fails over to. Every response, right or wrong, comes from the same next-token prediction process, so a fabricated citation or an invented API method reads with the same fluent confidence as a correct one. That is what makes hallucination different from a normal software bug — there is no exception thrown, no flag raised, nothing to catch. The output looks exactly as trustworthy whether it is right or wrong.',
          ],
        },
        {
          id: 'why-it-happens-training-and-prediction',
          heading: 'Why it happens: prediction, not lookup',
          paragraphs: [
            'A language model is trained to predict plausible continuations of text, learned from patterns across its training data. It does not store facts in a retrievable, checkable form the way a database does — it stores the statistical shape of language, including facts that were common enough in training to shape that shape. When a prompt asks for something the model saw rarely, saw inconsistently, or never saw at all, the model does not fail to answer; it produces the most plausible-sounding continuation anyway, because that is the only thing it knows how to do.',
            'This is also why hallucination gets worse on specific, obscure, or recent details — a real-sounding but invented court case, a plausible but wrong version number, a citation that reads like a real paper title. The more specific the claim, the more likely the model is filling a gap with something merely plausible rather than something known.',
          ],
        },
        {
          id: 'grounding-narrows-it-does-not-remove-it',
          heading: 'Grounding narrows the gap; it does not close it',
          paragraphs: [
            'Putting real source text in front of the model before it answers — retrieval, see what RAG is — measurably reduces hallucination on questions those sources actually cover, because the model can restate what it just read instead of predicting from training data alone. But it is a strong tendency, not a guarantee: if retrieval returns nothing useful, or the sources are incomplete, the model can still answer fluently from memory rather than admitting the sources didn’t help.',
          ],
        },
        {
          id: 'multiple-models-and-a-judge-are-a-filter-not-a-cure',
          heading: 'Cross-checking is a filter, not a cure',
          paragraphs: [
            'Asking several models the same question and comparing answers catches hallucinations that are specific to one model’s training or quirks — if only one of three models invents a detail, that disagreement is a signal. It does not catch a hallucination that most models happen to share, because training data overlaps across providers. The same limit applies to using a separate model as a judge to score an answer: a judge model can be fooled by the same kind of confident, fluent, wrong text it is supposed to be checking.',
          ],
        },
        {
          id: 'what-actually-reduces-it',
          heading: 'What actually reduces hallucination, in practice',
          paragraphs: [
            'No single technique removes hallucination, because it is a property of how these models generate text, not a bug specific to one model or provider. What measurably helps is narrowing the model’s job: grounding answers in retrieved source text for questions the sources cover, keeping requests specific rather than open-ended, and treating the model’s own citations, numbers, and named specifics as claims to verify rather than facts already checked. Combining techniques — grounding plus cross-checking plus verification against a source — reduces the surface area for error more than any one of them alone.',
          ],
        },
        {
          id: 'why-lower-temperature-does-not-fix-it',
          heading: 'Why turning down randomness doesn’t fix it',
          paragraphs: [
            'It’s a common assumption that a lower temperature setting (see temperature and top-p) makes a model more truthful, because the output looks more careful and deterministic. Temperature controls how the model samples among likely next tokens — it does not change what the model knows or add a fact-checking step. A model can hallucinate at temperature zero just as confidently as at temperature one; a lower setting just makes it hallucinate the same wrong answer more consistently.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can hallucination be fixed completely?',
          answer:
            'No, not with current language model architectures. It comes from how these models generate text — predicting plausible continuations rather than checking facts — so it can be reduced by grounding, cross-checking and verification, but not eliminated as a category.',
        },
        {
          question: 'Does a bigger or newer model hallucinate less?',
          answer:
            'Often less on common knowledge, because more of it was well-represented in training. It does not remove the underlying mechanism — a newer model can still hallucinate confidently on obscure, specific, or recent details it was not well trained on.',
        },
        {
          question: 'Is hallucination the same as the model lying?',
          answer:
            'No. Lying implies knowing the truth and stating otherwise. A model has no separate channel for "the truth" to compare its output against — it generates the most statistically plausible continuation whether that happens to be accurate or not.',
        },
        {
          question: 'Does giving the model your own documents stop hallucination?',
          answer:
            'It significantly reduces it for questions those documents actually answer, because the model can restate retrieved text instead of predicting from training data. It does not stop the model from answering fluently from memory when retrieval finds nothing relevant.',
        },
      ],
      productNote:
        'ClawAI does not claim to eliminate hallucination — no product honestly can. What it ships are the mitigations that measurably narrow it: retrieval-augmented answers grounded in your own documents (see what RAG is), multi-model consensus that surfaces disagreement between models (see what AI consensus is), and an AI judge that scores answers against defined criteria (see what an AI judge is) — three independent, real features, each a partial filter rather than a guarantee.',
    },
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
    [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]: {
      seo: {
        title: 'How to evaluate AI models for your own use',
        description:
          'A leaderboard score tells you how a model did on someone else’s tasks. What actually predicts whether it will work for yours — and the trade-offs of quality, cost, latency and privacy that a single number can’t show you.',
        keywords: [
          'how to evaluate AI models',
          'choosing an AI model',
          'AI model comparison criteria',
        ],
      },
      eyebrow: 'Foundations',
      title: 'How to evaluate AI models for your own use',
      summary:
        'Evaluating a model for your own work means testing it on your own tasks, not trusting a score computed on someone else’s. A model that tops a public leaderboard can still be the wrong choice for a specific job, once you weigh quality against cost, latency, and what you’re allowed to send it in the first place.',
      sections: [
        {
          id: 'a-leaderboard-score-is-not-your-score',
          heading: 'A leaderboard score is not your score',
          paragraphs: [
            'Public benchmarks measure performance on a fixed set of tasks that are rarely identical to yours — different domain, different format, different failure modes that matter to you. A model can rank near the top of a general benchmark and still perform worse than a smaller one on your specific kind of request, because the benchmark never tested anything like it.',
            'Benchmark scores also age quickly and can be affected by how familiar a model’s training data is with the exact benchmark questions, so a high score is a hint worth investigating, not a verdict worth trusting outright.',
          ],
        },
        {
          id: 'test-on-your-own-tasks',
          heading: 'The only reliable test is your own task',
          paragraphs: [
            'Take a representative sample of real requests from your actual use case — not simplified examples — and run them through the candidate models. Judge the outputs against what you would actually accept, not against a generic notion of a good answer. A model that writes elegant prose but gets your domain’s terminology wrong is a bad fit even if it reads beautifully.',
          ],
        },
        {
          id: 'quality-is-not-the-only-dimension',
          heading: 'Quality is one dimension among several that trade off against each other',
          paragraphs: [
            'The best-scoring model on quality is often also the slowest and most expensive per request. Whether that trade is worth it depends on the job: a background batch process can usually afford a slower, cheaper model; an interactive chat response usually can’t afford a slow one, however good. Evaluating a model in isolation, on quality alone, skips the trade-off that actually decides whether it’s usable in your product.',
          ],
        },
        {
          id: 'privacy-and-data-handling-are-evaluation-criteria-too',
          heading: 'What you’re allowed to send it is an evaluation criterion too',
          paragraphs: [
            'A model that scores well but requires sending sensitive data to a third party over the open internet may not be usable for a given workload regardless of quality — that constraint has to be checked before quality is even relevant, not after you’ve already picked a favorite. Where a task involves data you can’t send off your own infrastructure, running locally (see local AI) or self-hosted narrows the field before benchmarks come into it at all.',
          ],
        },
        {
          id: 'know-a-models-known-weaknesses',
          heading: 'Every model has known weak spots — find yours before you rely on it',
          paragraphs: [
            'A model’s known hallucination tendency on out-of-domain questions, or its consistency on tasks requiring careful step-by-step reasoning, is at least as important as its average score. If your use case touches a domain the model tends to guess at, evaluate that specifically rather than assuming a strong average score covers it — see why AI hallucinates for why average performance doesn’t predict behaviour on a specific weak spot.',
          ],
        },
        {
          id: 'reevaluate-not-just-at-launch',
          heading: 'Evaluation is not a one-time decision',
          paragraphs: [
            'Providers update models — sometimes silently, behind the same name and endpoint — and pricing and rate limits change. A model that was the right choice when you evaluated it can drift out of fit later. Treating model choice as a decision to revisit periodically, rather than something set once at launch, catches that drift before it becomes a production problem.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is a higher benchmark score always the better choice?',
          answer:
            'Not necessarily. Benchmarks test a fixed set of tasks that may not resemble yours, and a higher score often comes with higher cost or latency. The only way to know is to test the model on your own representative tasks.',
        },
        {
          question: 'How many test cases do I need to evaluate a model properly?',
          answer:
            'Enough to cover the range of requests your use case actually produces, including edge cases and the kinds of inputs that tend to go wrong. A handful of easy examples will make almost any model look good; the harder, more representative cases are where the real differences show up.',
        },
        {
          question: 'Should I re-evaluate a model after I’ve already chosen it?',
          answer:
            'Yes. Providers update models under the same name, pricing and rate limits change, and your own use case evolves. Treat the choice as reviewed periodically rather than fixed permanently at launch.',
        },
        {
          question: 'Do I need to test privacy and data handling separately from quality?',
          answer:
            'Yes, and it should come first if it disqualifies an option. A model’s quality score is irrelevant if the workload involves data you’re not allowed to send to that provider in the first place.',
        },
      ],
      productNote:
        'Rather than reducing a chat response to a single score, ClawAI’s routing transparency panel shows the cost class, latency class, routing confidence, and whether a fallback or judge model was used for that specific response — evaluation signal tied to the actual request, not a general leaderboard number.',
    },
    [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]: {
      seo: {
        title: 'How to read AI benchmarks without being misled',
        description:
          'A benchmark number looks precise, which makes it easy to over-trust. What a score like MMLU or HumanEval actually measures, the common ways benchmark numbers mislead, and what to check before treating one as meaningful for your use case.',
        keywords: [
          'how to read AI benchmarks',
          'AI benchmark scores explained',
          'understanding LLM benchmarks',
        ],
      },
      eyebrow: 'Foundations',
      title: 'How to read AI benchmarks without being misled',
      summary:
        'A benchmark score measures performance on one specific, fixed set of test questions — nothing more and nothing less. The number looks precise and objective, which is exactly why it’s easy to over-trust: a single figure can’t show you what the test covered, how the model was prompted, or whether the questions leaked into training data before the model ever saw them for real.',
      sections: [
        {
          id: 'a-benchmark-is-one-fixed-test-not-a-general-measure',
          heading: 'A benchmark is one fixed test, not a general measure of ability',
          paragraphs: [
            'Named benchmarks like MMLU (general knowledge multiple-choice), HumanEval (short coding problems), or GSM8K (grade-school math word problems) each test a narrow, specific skill in a specific format. A model can score well on one and poorly on a task that looks similar to a human but is structured differently — long-form coding versus short isolated functions, for instance, or open-ended writing versus multiple-choice recall.',
          ],
        },
        {
          id: 'contamination-benchmark-questions-leak-into-training-data',
          heading: 'Benchmark questions can leak into training data',
          paragraphs: [
            'Popular benchmarks are public, and their questions circulate widely on the web, in papers, and in forum discussions — exactly the kind of text large models train on. When a model has effectively seen the answer before, its score reflects memorization on that specific test, not the general capability the benchmark is meant to represent. This is called contamination, and it’s difficult for an outside reader to detect from the score alone.',
          ],
        },
        {
          id: 'scores-can-depend-heavily-on-how-the-model-was-prompted',
          heading: 'The reported score can depend heavily on how the model was prompted',
          paragraphs: [
            'The same model can score very differently depending on the prompt format, the number of worked examples shown before the real question, and whether it was allowed to reason step by step before answering. A provider reporting its best result under generous conditions is not lying, but that number may not resemble what you’d get with a plain, everyday prompt.',
          ],
        },
        {
          id: 'benchmarks-saturate-and-stop-being-useful',
          heading: 'Benchmarks saturate — and stop being useful once most models pass them',
          paragraphs: [
            'Once most leading models score close to the maximum on a benchmark, it stops distinguishing them meaningfully, even though the older number is often still quoted. A near-perfect score on a saturated benchmark tells you less than it used to; newer, harder benchmarks tend to replace it, and a marketing comparison that leans on an old, saturated number is worth a second look.',
          ],
        },
        {
          id: 'a-single-average-hides-where-a-model-actually-struggles',
          heading: 'A single average score hides exactly where a model struggles',
          paragraphs: [
            'An overall benchmark score is an average across many questions of varying difficulty and type. A model can average well while being unreliable on a specific sub-category that matters to you — a particular kind of reasoning, a specific domain, a certain length of task. The average is a summary, and summaries discard the detail that usually matters most for a real decision.',
          ],
        },
        {
          id: 'treat-a-benchmark-as-a-starting-point-not-a-verdict',
          heading: 'Treat a benchmark as a starting point, not a verdict',
          paragraphs: [
            'A benchmark score is most useful for a rough first filter — ruling a model clearly unsuitable, or shortlisting a few worth testing further — rather than as the final word on which model to use. See how to evaluate AI models for what actually predicts fit once you’ve narrowed a shortlist: testing on your own representative tasks, which no published benchmark can substitute for.',
          ],
        },
      ],
      faq: [
        {
          question: 'What does a benchmark like MMLU or HumanEval actually test?',
          answer:
            'A fixed, specific set of questions in a specific format — MMLU is multiple-choice general knowledge, HumanEval is short coding problems. Each measures a narrow skill, not general intelligence or ability across every task.',
        },
        {
          question: 'Why do benchmark scores from different providers sometimes seem inconsistent?',
          answer:
            'Scores can depend on prompt format, how many examples were shown before the real question, and whether step-by-step reasoning was allowed. Different reporting conditions produce different numbers for the same underlying model.',
        },
        {
          question: 'What is benchmark contamination?',
          answer:
            'When a benchmark’s public questions end up in a model’s training data, so the model has effectively seen the answers before being tested. The resulting score reflects memorization rather than the capability the benchmark was designed to measure.',
        },
        {
          question: 'Should I ignore benchmark scores entirely?',
          answer:
            'No — they’re a reasonable first filter for ruling out clearly unsuitable models or building a shortlist. Just don’t treat the final number as a verdict; test the shortlist on your own representative tasks before deciding.',
        },
      ],
      productNote:
        'ClawAI doesn’t publish its own benchmark leaderboard or claim a proprietary score for any model — instead its routing transparency panel shows the real cost class, latency class, and routing confidence behind a specific answer, so you can judge a response against your own request rather than a published test set you can’t inspect.',
    },
    [LearnTopic.WHAT_IS_PROMPT_INJECTION]: {
      seo: {
        title: 'What is prompt injection?',
        description:
          'A language model can’t reliably tell your instructions apart from instructions hidden in the content it’s reading — a webpage, a document, a tool result. What prompt injection actually is, why it can’t be fully solved by a smarter model, and what limits the damage when it happens.',
        keywords: [
          'what is prompt injection',
          'prompt injection attack explained',
          'indirect prompt injection',
        ],
      },
      eyebrow: 'Foundations',
      title: 'What is prompt injection?',
      summary:
        'Prompt injection is text that isn’t from you giving the model instructions anyway — hidden in a webpage it reads, a document it summarizes, or the result of a tool it calls. A language model doesn’t have a reliable, built-in way to separate "the user’s instructions" from "text that happens to look like instructions", because both arrive as the same kind of input: words in the context window.',
      sections: [
        {
          id: 'direct-vs-indirect-injection',
          heading: 'Two forms: direct and indirect',
          paragraphs: [
            'Direct injection is someone typing instructions straight into the chat trying to override the system’s intended behavior — asking the model to ignore its instructions, reveal hidden configuration, or act outside its intended scope. Indirect injection is the more consequential form: instructions planted in content the model reads on your behalf — a webpage, an email, a file, an API response — that the model was never meant to treat as commands but has no reliable way to distinguish from them.',
          ],
        },
        {
          id: 'why-a-smarter-model-does-not-solve-it',
          heading: 'Why a smarter model doesn’t fix this by itself',
          paragraphs: [
            'The problem isn’t that models are insufficiently intelligent — it’s architectural. Everything a model sees, whether it’s your request or text fetched from an untrusted source, becomes the same kind of token sequence once it enters the context window. There’s no separate, tamper-proof channel for "trusted instructions" versus "content to read." A more capable model can get better at recognizing common injection phrasing, but a sufficiently disguised instruction — split across text, phrased indirectly, hidden in formatting — can still slip through, because the underlying architecture has no hard boundary to enforce.',
          ],
        },
        {
          id: 'why-tool-calling-raises-the-stakes',
          heading: 'The risk grows sharply once a model can call tools',
          paragraphs: [
            'A chatbot that only produces text limits injection to bad or misleading output — annoying, but contained. Once a model can call tools (see how tool calling works) — sending an email, running a command, modifying a file — a successful injection can turn into an unwanted real-world action, not just a bad sentence. This is why systems that combine web browsing or document reading with tool access carry meaningfully more injection risk than a plain chatbot.',
          ],
        },
        {
          id: 'output-filtering-and-scope-limit-not-eliminate',
          heading: 'Filtering and scoping reduce the risk; neither removes it',
          paragraphs: [
            'Scanning fetched content for known injection patterns catches some attempts, but any fixed pattern list can be evaded by phrasing the instruction differently — this is a filter, not a guarantee. What reduces actual damage more reliably is limiting what a model is allowed to do regardless of what it was told: scoping tool access narrowly, requiring approval before a destructive or external-facing action, and never granting a model standing permissions wider than the specific task in front of it.',
          ],
        },
        {
          id: 'treat-fetched-content-as-untrusted-input',
          heading: 'The content a model reads is untrusted input, not a neutral fact source',
          paragraphs: [
            'Any system that lets a model read external content — a search result, a scraped page, a document a user uploaded — is exposing it to instructions it didn’t ask for. The practical implication is treating that content the way you’d treat unvalidated user input in any other software: assume it can contain something adversarial, and design the surrounding system so that a successful injection has limited reach rather than assuming injection won’t happen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can prompt injection be fully prevented?',
          answer:
            'No, not with current model architectures. There’s no built-in, tamper-proof separation between a user’s instructions and text a model reads from elsewhere, so filtering and scoping reduce risk and limit damage but can’t guarantee prevention.',
        },
        {
          question: 'Is prompt injection the same as jailbreaking?',
          answer:
            'They overlap but aren’t identical. Jailbreaking usually means a user directly trying to get a model to bypass its own guidelines. Prompt injection more often refers to instructions hidden in content the model reads on the user’s behalf, without the user’s knowledge.',
        },
        {
          question: 'Does prompt injection matter for a chatbot that can’t use tools?',
          answer:
            'It’s a smaller risk — a successful injection can produce a misleading or manipulated response, but it can’t take an action beyond generating text. The risk grows substantially once a model can call tools that do something outside the conversation.',
        },
        {
          question: 'Is scanning content for injection patterns enough protection?',
          answer:
            'It catches known, recognizable attempts, but any fixed pattern list can be evaded by rephrasing. Real protection also comes from limiting what a model is allowed to do — narrow tool scope and required approval for consequential actions — not from detection alone.',
        },
      ],
      productNote:
        'ClawAI’s research service scans fetched web content for known prompt-injection patterns and redacts secret-looking tokens before that content reaches a model — logging what it detects rather than silently blocking, since no fixed pattern list can catch every attempt. That detection layer is one part of a defense that also depends on scoping what tools a model can call in the first place.',
    },
  },
};
