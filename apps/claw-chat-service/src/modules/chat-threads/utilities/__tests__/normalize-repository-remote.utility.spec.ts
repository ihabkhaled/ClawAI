import { normalizeRepositoryRemote } from '../normalize-repository-remote.utility';

describe('normalizeRepositoryRemote (F095)', () => {
  it.each([
    ['https://github.com/acme/claw', 'https://github.com/acme/claw'],
    ['https://github.com/acme/claw.git', 'https://github.com/acme/claw'],
    ['https://github.com/acme/claw/', 'https://github.com/acme/claw'],
    ['https://github.com/acme/claw.git/', 'https://github.com/acme/claw'],
    ['  https://github.com/acme/claw  ', 'https://github.com/acme/claw'],
    ['HTTPS://GitHub.COM/Acme/Claw', 'https://github.com/Acme/Claw'],
    ['http://git.internal/team/app', 'https://git.internal/team/app'],
    ['https://gitlab.com/group/sub/group/app.git', 'https://gitlab.com/group/sub/group/app'],
    ['https://github.com//acme///claw', 'https://github.com/acme/claw'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeRepositoryRemote(input)).toBe(expected);
  });

  it.each([
    ['ssh://git@github.com/acme/claw.git', 'https://github.com/acme/claw'],
    ['ssh://git@github.com:2222/acme/claw.git', 'https://github.com/acme/claw'],
    ['git://github.com/acme/claw.git', 'https://github.com/acme/claw'],
    ['git@github.com:acme/claw.git', 'https://github.com/acme/claw'],
    ['github.com:acme/claw', 'https://github.com/acme/claw'],
    ['git@git.internal:/srv/git/app.git', 'https://git.internal/srv/git/app'],
  ])('maps the ssh/git/scp form %s to one https identifier', (input, expected) => {
    expect(normalizeRepositoryRemote(input)).toBe(expected);
  });

  it('keeps a non-default http port and drops the default one', () => {
    expect(normalizeRepositoryRemote('https://git.internal:8443/team/app')).toBe(
      'https://git.internal:8443/team/app',
    );
    expect(normalizeRepositoryRemote('https://git.internal:443/team/app')).toBe(
      'https://git.internal/team/app',
    );
  });

  it('is idempotent, so a stored value survives a second normalisation', () => {
    const once = normalizeRepositoryRemote('git@github.com:acme/claw.git') ?? '';
    expect(normalizeRepositoryRemote(once)).toBe(once);
  });

  describe('never keeps a credential, a query or a fragment', () => {
    it.each([
      ['https://user:s3cret@github.com/acme/claw.git', 'https://github.com/acme/claw'],
      ['https://ghp_tokenvalue@github.com/acme/claw', 'https://github.com/acme/claw'],
      ['https://github.com/acme/claw?access_token=abc123', 'https://github.com/acme/claw'],
      ['https://github.com/acme/claw#frag', 'https://github.com/acme/claw'],
      ['https://oauth2:abc@gitlab.com/g/app.git?x=1#y', 'https://gitlab.com/g/app'],
      ['ssh://deploy:hunter2@host.example/app.git', 'https://host.example/app'],
    ])('%s', (input, expected) => {
      const result = normalizeRepositoryRemote(input);
      expect(result).toBe(expected);
      expect(result).not.toMatch(/s3cret|ghp_|access_token|abc123|hunter2|oauth2|deploy/);
    });
  });

  describe('refuses what is not a remote', () => {
    it.each([
      ['empty', ''],
      ['blank', '   '],
      ['a local path', '/home/me/claw'],
      ['a Windows path', 'C:\\Users\\me\\claw'],
      ['a file URL', 'file:///home/me/claw'],
      ['a javascript URL', 'javascript:alert(1)'],
      ['a data URL', 'data:text/plain,hello'],
      ['ftp', 'ftp://host/repo'],
      ['a host with no path', 'https://github.com'],
      ['a host with only a slash', 'https://github.com/'],
      ['a path that climbs', 'https://github.com/acme/../secret'],
      ['whitespace inside the path', 'https://github.com/acme/my repo'],
      ['a control character', 'https://github.com/acme/claw\u0000'],
      ['garbage', 'not a url at all'],
      ['a bare word', 'claw'],
    ])('%s', (_label, input) => {
      expect(normalizeRepositoryRemote(input)).toBeNull();
    });
  });
});
