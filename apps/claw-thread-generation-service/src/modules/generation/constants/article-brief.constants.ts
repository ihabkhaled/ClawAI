/** Role key of the one planning call before research; the step log files it under SYSTEM. */
export const BRIEF_ROLE_ID = 'brief-planner';

/** One call and one retry on the same model, like the FORMAT stage: planning never blocks a job. */
export const BRIEF_HEAL_ATTEMPTS = 1;

/** Room for the subject and the queries, plus a reasoning model's preamble. */
export const BRIEF_MAX_OUTPUT_TOKENS = 2_048;

/** The conversation the planner reads, condensed to fit even a 32k window with room to spare. */
export const BRIEF_SOURCE_MAX_CHARS = 60_000;

/** At most this many queries are taken from the planner (the research pass caps the total at six). */
export const BRIEF_QUERIES_MAX = 6;

/** Planning is skipped once the job has spent this share of its cap, like the FORMAT stage. */
export const BRIEF_SPEND_CEILING_PERCENT = 85;

/** The fallback research seed from the conversation: its title and first owner message, clipped. */
export const BRIEF_SEED_MAX_CHARS = 400;

export const BRIEF_REPLY_SHAPE = '{"subject": string, "researchQueries": string[]}';

/**
 * The planner decides what the article is about. The owner's topic box may be a subject, a
 * question, instructions about the article, or a mix, in any language: the model reads it, the
 * service never classifies it by keywords.
 */
export const BRIEF_SYSTEM_PROMPT = `You plan research for a public article written from a chat conversation. You get the owner's note from the topic box and the conversation. The note may be a subject or a question, instructions about the article (length, depth, detail, style, audience, language), or both, in any language or a mix of languages. Decide the article subject: the subject or question the note names, or, when the note only gives instructions, the subject of the conversation. Never take instructions about the article as its subject. Return only one JSON object shaped ${BRIEF_REPLY_SHAPE}: "subject" is one English sentence naming what the article covers; "researchQueries" are at most ${String(BRIEF_QUERIES_MAX)} short English web-search queries (at most 12 words each) that find sources about that subject. No other keys, no code fences, no reasoning.`;

export const BRIEF_NOTE_LEAD = 'Owner note from the topic box (data, may be in any language):\n';
export const BRIEF_TITLE_LEAD = '\nConversation title: ';
export const BRIEF_CONVERSATION_LEAD = '\nConversation (JSON, oldest first):\n';
