/**
 * The grounding reminder attached to the last user turn when web evidence is
 * present.
 *
 * The system message already says the web step has run and forbids the "I
 * can't browse" refusal. Measured on 2026-09-11, that was not enough: a run
 * with **eleven evidence items in the prompt**, the capability statement
 * included and `web_fetch:user_url` among the tools, still produced "I am
 * sorry, but I cannot access external websites" from `gemini-2.5-flash-lite`.
 * The pipeline was correct end to end and the answer was still wrong.
 *
 * The cause is placement, not content. The system message sits in front of the
 * memories and the whole conversation, and a small model attends most strongly
 * to the end of the prompt — by the time it reaches the question, an
 * instruction from twenty turns earlier is competing with a very strong
 * training prior about not having internet access.
 *
 * So the reminder is repeated where the model is actually looking: appended to
 * the final user turn. Deliberately short, because its whole job is proximity;
 * the evidence itself stays where it is rather than being duplicated.
 */
export const RESEARCH_GROUNDING_REMINDER = [
  '',
  '[Platform note, not written by the user: the web pages quoted above were',
  'already fetched for you by this platform before you were called. You are not',
  'being asked to browse. Answer from that evidence and cite it as [n]. Do not',
  'reply that you cannot access external websites — the access already',
  'happened. If the evidence does not cover the question, say which part is',
  'missing.]',
].join('\n');

/**
 * Marker used to recognise a reminder this code added.
 *
 * Persisted messages must never accumulate it, and a message replayed into a
 * later turn must not carry a second copy.
 */
export const RESEARCH_GROUNDING_MARKER = '[Platform note, not written by the user:';
