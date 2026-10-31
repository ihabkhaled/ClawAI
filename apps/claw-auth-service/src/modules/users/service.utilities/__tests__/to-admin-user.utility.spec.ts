import { PresenceState, UserRole, UserStatus } from '../../../../common/enums';
import { type User } from '../../../../generated/prisma';
import { toAdminUser } from '../to-admin-user.utility';
import { toSafeUser } from '../to-safe-user.utility';

const NOW = new Date('2026-10-31T12:00:00.000Z');

function row(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'a@b.co',
    username: 'a',
    passwordHash: 'secret-hash',
    role: UserRole.USER,
    roleId: null,
    activePlanId: null,
    status: UserStatus.ACTIVE,
    isSuperAdmin: false,
    emailVerifiedAt: null,
    firstName: null,
    lastName: null,
    phone: '+201001234567',
    mustChangePassword: false,
    languagePreference: 'EN',
    appearancePreference: 'SYSTEM',
    currencyPreferenceMode: 'AUTO',
    preferredCountryCode: null,
    preferredCurrencyCode: null,
    ttsVoice: null,
    registrationIp: '41.33.1.1',
    registrationCountryCode: 'EG',
    lastSeenAt: new Date(NOW.getTime() - 60_000),
    bannedAt: null,
    bannedUntil: null,
    banReason: null,
    bannedByUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as User;
}

describe('toAdminUser', () => {
  it('adds registration origin and presence to the safe user and never the password hash', () => {
    const admin = toAdminUser(row(), NOW);
    expect(admin).toMatchObject({
      registrationIp: '41.33.1.1',
      registrationCountryCode: 'EG',
      presence: PresenceState.ONLINE,
      isBanned: false,
      phone: '+201001234567',
    });
    expect(JSON.stringify(admin)).not.toContain('secret-hash');
  });

  it('the self-service view never carries the registration IP (admin-only personal data)', () => {
    const safe = toSafeUser(row()) as unknown as Record<string, unknown>;
    expect(safe).not.toHaveProperty('registrationIp');
    expect(safe).not.toHaveProperty('registrationCountryCode');
    expect(safe).not.toHaveProperty('banReason');
  });

  it('reports an active lifetime ban with its reason', () => {
    const admin = toAdminUser(
      row({ bannedAt: NOW, bannedUntil: null, banReason: 'abuse', bannedByUserId: 'admin-1' }),
      NOW,
    );
    expect(admin).toMatchObject({ isBanned: true, banPermanent: true, banReason: 'abuse' });
  });

  it('reports an active timed ban with its end', () => {
    const until = new Date(NOW.getTime() + 3_600_000);
    const admin = toAdminUser(row({ bannedAt: NOW, bannedUntil: until, banReason: 'spam' }), NOW);
    expect(admin).toMatchObject({ isBanned: true, banPermanent: false, bannedUntil: until });
  });

  it('shows an expired timed ban as lifted (effective status), hiding the stale notes', () => {
    const admin = toAdminUser(
      row({
        bannedAt: new Date(NOW.getTime() - 7_200_000),
        bannedUntil: new Date(NOW.getTime() - 1),
        banReason: 'old',
      }),
      NOW,
    );
    expect(admin).toMatchObject({
      isBanned: false,
      banPermanent: false,
      bannedAt: null,
      bannedUntil: null,
      banReason: null,
    });
  });

  it('marks a never-seen user OFFLINE', () => {
    expect(toAdminUser(row({ lastSeenAt: null }), NOW).presence).toBe(PresenceState.OFFLINE);
  });
});
