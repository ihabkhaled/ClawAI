import { Injectable } from '@nestjs/common';

import { AuthProfileClient } from '../clients/auth-profile.client';
import {
  AUTHOR_IDENTITY_CACHE_MAX_ENTRIES,
  AUTHOR_IDENTITY_CACHE_TTL_MS,
  AUTHOR_IDENTITY_MAX_BATCH,
} from '../constants/author-identity.constants';
import type { AuthorProfile, PublicAuthor } from '../types/author-identity.types';
import { toPublicAuthor } from '../utilities/author-identity.utility';
import { BoundedTtlCache } from '../utilities/bounded-ttl-cache.utility';

/**
 * Turns user ids into the names readers see. A cache of about a minute keeps a busy thread from
 * calling auth-service once per comment. An id that auth-service does not return (deleted,
 * suspended, lookup failed) is simply absent from the map, so the page shows "Member".
 */
@Injectable()
export class AuthorIdentityService {
  private readonly byId = new BoundedTtlCache<AuthorProfile>(
    AUTHOR_IDENTITY_CACHE_TTL_MS,
    AUTHOR_IDENTITY_CACHE_MAX_ENTRIES,
  );
  private readonly byUsername = new BoundedTtlCache<AuthorProfile>(
    AUTHOR_IDENTITY_CACHE_TTL_MS,
    AUTHOR_IDENTITY_CACHE_MAX_ENTRIES,
  );

  constructor(private readonly client: AuthProfileClient) {}

  /** Names for the given ids. Null, empty and repeated ids are ignored. Never throws. */
  async resolveMany(
    ids: ReadonlyArray<string | null | undefined>,
  ): Promise<Map<string, PublicAuthor>> {
    const wanted = [
      ...new Set(ids.filter((id): id is string => typeof id === 'string' && id !== '')),
    ];
    const result = new Map<string, PublicAuthor>();
    const missing: string[] = [];
    for (const id of wanted) {
      const cached = this.byId.get(id);
      if (cached) {
        result.set(id, toPublicAuthor(cached));
      } else {
        missing.push(id);
      }
    }
    for (let start = 0; start < missing.length; start += AUTHOR_IDENTITY_MAX_BATCH) {
      const batch = missing.slice(start, start + AUTHOR_IDENTITY_MAX_BATCH);
      const profiles = await this.client.fetchProfiles(batch);
      for (const profile of profiles) {
        // Only an id that was asked for is accepted: a confused answer cannot add strangers.
        if (!batch.includes(profile.id)) continue;
        this.remember(profile);
        result.set(profile.id, toPublicAuthor(profile));
      }
    }
    return result;
  }

  async resolveOne(id: string | null): Promise<PublicAuthor | null> {
    return id === null ? null : ((await this.resolveMany([id])).get(id) ?? null);
  }

  /** Case-insensitive. Returns the account (with id, for notifications) or null. */
  async resolveByUsername(username: string): Promise<AuthorProfile | null> {
    const key = username.toLowerCase();
    const cached = this.byUsername.get(key);
    if (cached) return cached;
    const profile = await this.client.fetchByUsername(username);
    if (profile !== null) {
      this.remember(profile);
    }
    return profile;
  }

  private remember(profile: AuthorProfile): void {
    this.byId.set(profile.id, profile);
    this.byUsername.set(profile.username.toLowerCase(), profile);
  }
}
