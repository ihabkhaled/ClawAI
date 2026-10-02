import { Injectable } from '@nestjs/common';

import {
  DERIVED_DESCRIPTION_MAX_ENTRIES,
  DERIVED_DESCRIPTION_TTL_MS,
} from '../constants/attachment-awareness.constants';
import type { StoredDescription } from '../types/derived-description.types';
import type { DerivedImageObservation } from '../types/vision-helper.types';

/**
 * What the vision helper already wrote about an image, kept per (user, file)
 * for a few hours (ADR-152). A follow-up turn reuses it, so the helper is not
 * paid for again, and the research planner can read it. Only successful
 * descriptions are stored; a failure is retried on the next turn. In memory
 * and per replica, so an image carried from an earlier turn is only reused
 * from here: a miss keeps OCR and the honest note and never buys a new helper
 * call (VisionHelperManager.upgradeContext).
 */
@Injectable()
export class DerivedImageDescriptionStore {
  private readonly entries = new Map<string, StoredDescription>();

  get(userId: string, fileId: string, now = Date.now()): DerivedImageObservation | undefined {
    const key = this.key(userId, fileId);
    const hit = this.entries.get(key);
    if (hit === undefined) {
      return undefined;
    }
    if (hit.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.observation;
  }

  set(userId: string, observation: DerivedImageObservation, now = Date.now()): void {
    const key = this.key(userId, observation.fileId);
    this.entries.delete(key);
    this.entries.set(key, { observation, expiresAt: now + DERIVED_DESCRIPTION_TTL_MS });
    while (this.entries.size > DERIVED_DESCRIPTION_MAX_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) {
        break;
      }
      this.entries.delete(oldest.value);
    }
  }

  private key(userId: string, fileId: string): string {
    return `${userId}:${fileId}`;
  }
}
