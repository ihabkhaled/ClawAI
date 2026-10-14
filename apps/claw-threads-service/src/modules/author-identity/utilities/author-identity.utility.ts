import type { AuthorProfile, PublicAuthor } from '../types/author-identity.types';

/** What a reader may see of a profile: a name, never the id. */
export function toPublicAuthor(profile: AuthorProfile): PublicAuthor {
  return { username: profile.username, displayName: profile.displayName };
}
