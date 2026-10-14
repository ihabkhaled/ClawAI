import { toPublicProfile } from '../public-profile.utility';

const base = { id: 'u1', username: 'ada', firstName: null, lastName: null };

describe('toPublicProfile', () => {
  it('uses first and last name when set', () => {
    expect(toPublicProfile({ ...base, firstName: 'Ada', lastName: 'Lovelace' })).toEqual({
      id: 'u1',
      username: 'ada',
      displayName: 'Ada Lovelace',
    });
  });

  it('uses a single name part and collapses whitespace', () => {
    const profile = toPublicProfile({ ...base, firstName: '  Ada \t x ', lastName: null });
    expect(profile.displayName).toBe('Ada x');
  });

  it('falls back to the username when both names are empty', () => {
    expect(toPublicProfile({ ...base, firstName: ' ', lastName: '' }).displayName).toBe('ada');
  });

  it('never carries an email or any other field', () => {
    const profile = toPublicProfile({ ...base, email: 'a@b.c' } as never);
    expect(Object.keys(profile).sort()).toEqual(['displayName', 'id', 'username']);
  });
});
