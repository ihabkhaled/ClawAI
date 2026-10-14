import type { PublicProfile, PublicProfileSource } from '../types/users.types';

/** First + last name when either is set, otherwise the username. Names are single-line and trimmed. */
export function toPublicProfile(user: PublicProfileSource): PublicProfile {
  const name = [user.firstName, user.lastName]
    .map((part) => (part ?? '').replaceAll(/\s+/gu, ' ').trim())
    .filter((part) => part.length > 0)
    .join(' ');
  return {
    id: user.id,
    username: user.username,
    displayName: name.length > 0 ? name : user.username,
  };
}
