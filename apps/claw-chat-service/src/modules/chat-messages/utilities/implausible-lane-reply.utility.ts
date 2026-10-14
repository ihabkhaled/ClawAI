import {
  LANE_IMPLAUSIBLY_SHORT_REPLY_MAX_CHARS,
  LANE_LONG_PROMPT_MIN_CHARS,
  SHORT_ANSWER_REQUEST_CUES,
} from '../constants/implausible-lane-reply.constants';

/** True when the prompt explicitly asks for a one-word / yes-no style answer. */
export function asksForShortAnswer(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return SHORT_ANSWER_REQUEST_CUES.some((cue) => lower.includes(cue));
}

/**
 * True when a Compare lane "succeeded" with a fragment (one word, one token) for
 * a long prompt, which is a cut-off stream and not an answer (round-2 C06: a
 * lane stored "Une" as its result). A cancelled lane is the user's own Stop and
 * is not judged here, and neither is a prompt that asked for a short answer.
 */
export function isImplausiblyShortLaneReply(args: {
  content: string;
  userPrompt: string;
  finishReason: string | undefined;
}): boolean {
  return (
    args.finishReason !== 'cancelled' &&
    args.userPrompt.trim().length >= LANE_LONG_PROMPT_MIN_CHARS &&
    !asksForShortAnswer(args.userPrompt) &&
    args.content.trim().length <= LANE_IMPLAUSIBLY_SHORT_REPLY_MAX_CHARS
  );
}
