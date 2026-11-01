import {
  MEDIA_CLAIM_KINDS,
  MEDIA_CLAIM_LOOKAHEAD,
  MEDIA_CLAIM_SENTENCE_SPLIT,
  MEDIA_CLAIM_SPEAKERS,
  MEDIA_CLAIM_VERBS,
  MEDIA_CLAIM_WORD_SPLIT,
} from '../constants/media-tools.constants';

/** Whether one sentence says media was made: "Image generated: ...", "I have created the image". */
function sentenceClaimsMedia(sentence: string): boolean {
  const words = sentence.toLowerCase().split(MEDIA_CLAIM_WORD_SPLIT).filter(Boolean);
  const verbAt = words.findIndex((word) => MEDIA_CLAIM_VERBS.has(word));
  if (verbAt < 0) return false;
  const first = words[0] ?? '';
  const kindBefore = MEDIA_CLAIM_KINDS.has(first) && verbAt <= MEDIA_CLAIM_LOOKAHEAD;
  const kindAfter = words
    .slice(verbAt + 1, verbAt + 1 + MEDIA_CLAIM_LOOKAHEAD)
    .some((word) => MEDIA_CLAIM_KINDS.has(word));
  const kindEarlier = words.slice(0, verbAt).some((word) => MEDIA_CLAIM_KINDS.has(word));
  return kindBefore || ((kindAfter || kindEarlier) && MEDIA_CLAIM_SPEAKERS.has(first));
}

function sentencesOf(line: string): string[] {
  return line.split(MEDIA_CLAIM_SENTENCE_SPLIT);
}

/** True when the reply announces media that was made. */
export function claimsMedia(text: string): boolean {
  return text.split('\n').some((line) => sentencesOf(line).some(sentenceClaimsMedia));
}

/** The reply without the sentences that announce made media. */
export function stripMediaClaims(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      sentencesOf(line)
        .filter((sentence) => !sentenceClaimsMedia(sentence))
        .join(' '),
    )
    .join('\n')
    .replaceAll(/\n{3,}/gu, '\n\n')
    .trim();
}
