import {
  LANE_IMPLAUSIBLY_SHORT_REPLY_MAX_CHARS,
  LANE_LONG_PROMPT_MIN_CHARS,
} from '../constants/implausible-lane-reply.constants';

/**
 * True when a Compare lane "succeeded" with a fragment (one word, one token) for
 * a long prompt, which is a cut-off stream and not an answer (round-2 C06: a
 * lane stored "Une" as its result). A cancelled lane is the user's own Stop and
 * is not judged here.
 */
export function isImplausiblyShortLaneReply(args: {
  content: string;
  userPrompt: string;
  finishReason: string | undefined;
}): boolean {
  return (
    args.finishReason !== 'cancelled' &&
    args.userPrompt.trim().length >= LANE_LONG_PROMPT_MIN_CHARS &&
    args.content.trim().length <= LANE_IMPLAUSIBLY_SHORT_REPLY_MAX_CHARS
  );
}
