import { optionalViewerId } from '../utilities/optional-viewer.utility';

vi.mock('@claw/shared-utilities', () => ({
  verifyUserAccessToken: (token: string) => {
    if (token === 'good') return { sub: 'user-1' };
    throw new Error('bad');
  },
}));

describe('optionalViewerId', () => {
  beforeEach(() => {
    process.env['JWT_SECRET'] = 's';
  });

  it('returns the user id for a valid bearer token', () => {
    expect(optionalViewerId('Bearer good')).toBe('user-1');
  });

  it.each([undefined, '', 'Bearer', 'Basic good', 'Bearer bad', 'Bearer good extra'])(
    'returns undefined for %s',
    (header) => {
      expect(optionalViewerId(header)).toBeUndefined();
    },
  );

  it('returns undefined when no secret is configured', () => {
    delete process.env['JWT_SECRET'];
    expect(optionalViewerId('Bearer good')).toBeUndefined();
  });
});
