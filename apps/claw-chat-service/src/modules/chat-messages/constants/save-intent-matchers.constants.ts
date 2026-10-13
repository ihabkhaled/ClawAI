import {
  anchoredCueRegExp,
  cueRegExp,
  weakCueRegExp,
  wholeMessageRegExp,
} from '../utilities/save-cue-matcher.utility';
import {
  SAVE_ANAPHORIC_OBJECTS,
  SAVE_ANAPHORIC_WORDS,
  SAVE_PREFILTER_ANCHORED_CUES,
  SAVE_PREFILTER_CUES,
  SAVE_PREFILTER_WEAK_CUES,
  SAVE_WHOLE_MESSAGE_WORDS,
} from './save-intent-cues.constants';
import { SAVE_PREFILTER_WORDS } from './save-intent.constants';

/** One alternation per list: a single linear scan, however long the message. */
export const SAVE_PREFILTER_REGEXP = cueRegExp([...SAVE_PREFILTER_WORDS, ...SAVE_PREFILTER_CUES]);
export const SAVE_PREFILTER_ANCHORED_REGEXP = anchoredCueRegExp(SAVE_PREFILTER_ANCHORED_CUES);
export const SAVE_PREFILTER_WEAK_REGEXP = weakCueRegExp(SAVE_PREFILTER_WEAK_CUES);
export const SAVE_ANAPHORIC_REGEXP = wholeMessageRegExp(
  SAVE_ANAPHORIC_WORDS,
  SAVE_ANAPHORIC_OBJECTS,
  false,
);
export const SAVE_WHOLE_MESSAGE_REGEXP = wholeMessageRegExp(
  SAVE_WHOLE_MESSAGE_WORDS,
  SAVE_ANAPHORIC_OBJECTS,
  true,
);
