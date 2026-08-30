import {
  REFERENCE_DETECTORS,
  SHORT_PROMPT_WEIGHT,
  SHORT_PROMPT_WORDS,
} from '../constants/reference-signal.constants';
import { type ReferenceSignal } from '../types/context-composer.types';

/**
 * How strongly a prompt points at something said earlier.
 *
 * The critical property is NOT that this is more accurate than the regex it
 * replaces. It is that nothing downstream may remove history when it returns
 * `false`. `referential` only RAISES the rank of older turns; recent turns are
 * sent either way. A detector that can only add cannot cause the failure the
 * old one caused. See ADR-084.
 */
export function detectReferenceSignal(prompt: string): ReferenceSignal {
  const normalized = prompt.trim();
  if (normalized.length === 0) {
    return { referential: false, strength: 0, signals: [] };
  }

  const signals: string[] = [];
  let strength = 0;
  for (const detector of REFERENCE_DETECTORS) {
    if (detector.pattern.test(normalized)) {
      signals.push(detector.name);
      strength += detector.weight;
    }
  }

  if (normalized.split(/\s+/).length <= SHORT_PROMPT_WORDS) {
    signals.push('SHORT_PROMPT');
    strength += SHORT_PROMPT_WEIGHT;
  }

  return {
    referential: signals.length > 0,
    strength: Math.min(strength, 1),
    signals,
  };
}
