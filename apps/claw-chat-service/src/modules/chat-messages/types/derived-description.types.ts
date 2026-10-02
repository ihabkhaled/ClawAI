import type { DerivedImageObservation } from './vision-helper.types';

/** One remembered vision-helper description and when it stops being reused (ADR-152). */
export type StoredDescription = {
  observation: DerivedImageObservation;
  expiresAt: number;
};
