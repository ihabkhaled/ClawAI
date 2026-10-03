import {
  MENTION_CUES,
  MENTION_ENUMERATION_MIN_COMMAS,
  MENTION_ENUMERATION_MIN_VERBS,
  MENTION_GENERATION_VERB,
  MENTION_HARD_HANDOVER,
  MENTION_LIST_MARKER,
  MENTION_OPENERS,
  MENTION_REQUEST_PREFIX,
  MENTION_SENTENCE_SPLIT,
  MENTION_TOPIC_MARKERS,
  MENTION_WRITING_HANDOVER,
  MENTION_WRITING_VERBS,
  MENTION_WRITTEN_DELIVERABLES,
} from './generation-mention.constants';

function verbIndexes(lower: string): number[] {
  return [...lower.matchAll(MENTION_GENERATION_VERB)].map((match) => match.index ?? 0);
}

/** Whether the sentence OPENS with a generation verb once greetings and politeness are removed. */
function opensWithVerb(lower: string): boolean {
  const rest = lower.trim().replace(MENTION_REQUEST_PREFIX, '');
  const first = verbIndexes(rest).at(0);
  return first === 0;
}

function countCommas(text: string): number {
  return (text.match(/[,،、]/gu) ?? []).length;
}

/**
 * A sentence that talks ABOUT generating without asking for it: it adds
 * material ("say also …"), describes abilities ("our app can create files"),
 * or lists verbs ("create files, documents, pdf … create videos").
 */
export function isMentionSentence(sentence: string): boolean {
  const lower = sentence.toLowerCase().trim();
  if (MENTION_OPENERS.some((opener) => opener.test(lower)))
    return openerRemainder(sentence) === null;
  const verbs = verbIndexes(lower);
  const firstVerb = verbs.at(0);
  if (firstVerb === undefined) return false;
  const cueBeforeVerb = MENTION_CUES.some((cue) => {
    const at = cue.exec(lower)?.index;
    return at !== undefined && at < firstVerb;
  });
  return (
    cueBeforeVerb ||
    (!opensWithVerb(lower) &&
      verbs.length >= MENTION_ENUMERATION_MIN_VERBS &&
      countCommas(lower) >= MENTION_ENUMERATION_MIN_COMMAS)
  );
}

/**
 * What follows a supplementary opener when it is itself a request: "Say also
 * make me a logo" asks for a logo; "Say also talk to models, create files, …"
 * adds material. Null when nothing request-like follows.
 */
function openerRemainder(sentence: string): string | null {
  const lower = sentence.toLowerCase().trim();
  for (const opener of MENTION_OPENERS) {
    const matched = opener.exec(lower);
    if (matched === null) continue;
    const rest = sentence
      .trim()
      .slice(matched[0].length)
      .replace(/^[\s,:;-]+/u, '');
    return opensWithVerb(rest.toLowerCase()) && !isMentionSentence(rest) ? rest : null;
  }
  return null;
}

function isWritingTask(lower: string): boolean {
  return MENTION_WRITING_VERBS.test(lower) && MENTION_WRITTEN_DELIVERABLES.test(lower);
}

/**
 * In a writing task ("write a post about …") the generation words are the
 * topic. Only a separate, single request handed over afterwards survives:
 * "write a post and draw a cat to go with it" keeps "draw a cat to go with it".
 */
function writingTaskRequest(sentence: string): string | null {
  const lower = sentence.toLowerCase();
  const handover = new RegExp(MENTION_WRITING_HANDOVER.source, 'gu');
  for (const match of lower.matchAll(handover)) {
    const head = lower.slice(0, match.index ?? 0);
    if (MENTION_TOPIC_MARKERS.test(head) && !MENTION_HARD_HANDOVER.test(match[0])) continue;
    const tail = sentence.slice((match.index ?? 0) + match[0].length);
    const tailLower = tail.toLowerCase();
    if (
      opensWithVerb(tailLower) &&
      verbIndexes(tailLower).length === 1 &&
      countCommas(tailLower) <= 1 &&
      !isMentionSentence(tail)
    ) {
      return tail;
    }
  }
  return null;
}

/**
 * The sentences of a message that can ask the assistant to generate something:
 * mentions, feature lists, supplementary notes and the topic of a writing task
 * are removed; a bullet list inherits its lead-in line's verdict.
 */
export function requestSentences(message: string): string[] {
  const kept: string[] = [];
  let leadIsMention = false;
  for (const line of message.split(/\n/u)) {
    const isItem = MENTION_LIST_MARKER.test(line);
    const text = line.replace(MENTION_LIST_MARKER, '');
    for (const sentence of text.split(MENTION_SENTENCE_SPLIT)) {
      if (sentence.trim().length === 0) continue;
      const lower = sentence.toLowerCase();
      const writing = isWritingTask(lower);
      const mention = writing || isMentionSentence(sentence);
      if (!isItem) leadIsMention = mention;
      if (isItem && leadIsMention) continue;
      if (!mention) {
        kept.push(sentence.trim());
      } else if (writing) {
        const tail = writingTaskRequest(sentence);
        if (tail !== null) kept.push(tail.trim());
      }
    }
  }
  return kept;
}
