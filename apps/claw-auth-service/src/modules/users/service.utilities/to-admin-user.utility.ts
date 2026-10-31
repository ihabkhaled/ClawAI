import { type User } from '../../../generated/prisma';
import { type AdminUser } from '../types/users.types';
import { resolveBanState } from './ban-state.utility';
import { resolvePresence } from './presence.utility';
import { toSafeUser } from './to-safe-user.utility';

/**
 * The administrator's view of one account. Only the admin endpoints may call
 * this: it adds the registration IP (personal data) and the ban notes.
 * An EXPIRED ban reads as no ban, so the list never shows a lifted ban as live.
 */
export function toAdminUser(user: User, now: Date = new Date()): AdminUser {
  const ban = resolveBanState(user, now);
  const active = ban.status === 'ACTIVE';
  return {
    ...toSafeUser(user),
    registrationIp: user.registrationIp,
    registrationCountryCode: user.registrationCountryCode,
    lastSeenAt: user.lastSeenAt,
    presence: resolvePresence(user.lastSeenAt, now),
    isBanned: active,
    banPermanent: active && ban.permanent,
    bannedAt: active ? user.bannedAt : null,
    bannedUntil: active ? user.bannedUntil : null,
    banReason: active ? user.banReason : null,
    bannedByUserId: active ? user.bannedByUserId : null,
  };
}
