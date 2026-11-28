import {
  MS_PER_MINUTE,
  SUSPENSION_LEVEL_FIRST,
  SUSPENSION_LEVEL_MAX,
  SUSPENSION_LEVEL_SECOND,
} from '../constants/abuse-defense.constants';
import type { AbuseSettings } from '../types/abuse-defense.types';

/**
 * The rung of the 1 h / 24 h / 7 d ladder for an account that has `priorSuspensions` live
 * (not lifted) suspensions inside the escalation window. The third rung repeats; only an
 * administrator makes a ban permanent.
 */
export function suspensionLevelFor(priorSuspensions: number): number {
  const level = SUSPENSION_LEVEL_FIRST + Math.max(0, Math.trunc(priorSuspensions));
  return Math.min(level, SUSPENSION_LEVEL_MAX);
}

/** How long a rung lasts, in milliseconds. */
export function suspensionDurationMs(level: number, settings: AbuseSettings): number {
  const [first, second, third] = settings.suspensionMinutes;
  let minutes = third;
  if (level <= SUSPENSION_LEVEL_FIRST) {
    minutes = first;
  } else if (level === SUSPENSION_LEVEL_SECOND) {
    minutes = second;
  }
  return minutes * MS_PER_MINUTE;
}
