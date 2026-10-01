import { createThreadSchema } from '../create-thread.dto';
import { repositoryRefSchema } from '../repository-ref.dto';

describe('repositoryRefSchema (F095)', () => {
  it('accepts a name alone', () => {
    const result = repositoryRefSchema.safeParse({ name: 'claw' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ name: 'claw' });
  });

  it('normalises the remote and keeps the branch', () => {
    const result = repositoryRefSchema.safeParse({
      name: ' claw ',
      remoteUrl: 'https://tok:en@github.com/acme/claw.git?x=1',
      branch: 'feature/f095',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: 'claw',
        remoteUrl: 'https://github.com/acme/claw',
        branch: 'feature/f095',
      });
    }
  });

  it('boundary: 200 character name and branch pass, 201 fail', () => {
    expect(
      repositoryRefSchema.safeParse({ name: 'n'.repeat(200), branch: 'b'.repeat(200) }).success,
    ).toBe(true);
    expect(repositoryRefSchema.safeParse({ name: 'n'.repeat(201) }).success).toBe(false);
    expect(repositoryRefSchema.safeParse({ name: 'n', branch: 'b'.repeat(201) }).success).toBe(
      false,
    );
  });

  it('boundary: a remote over 500 characters is refused', () => {
    const long = `https://github.com/acme/${'r'.repeat(500)}`;
    expect(repositoryRefSchema.safeParse({ name: 'n', remoteUrl: long }).success).toBe(false);
  });

  it.each([
    ['missing name', {}],
    ['empty name', { name: '' }],
    ['blank name', { name: '   ' }],
    ['null name', { name: null }],
    ['numeric name', { name: 1 }],
    ['a path as the name', { name: 'src/claw' }],
    ['a Windows path as the name', { name: 'C:\\src\\claw' }],
    ['a control character in the name', { name: 'cl\u0007aw' }],
    ['an empty branch', { name: 'n', branch: '' }],
    ['a branch with a space', { name: 'n', branch: 'my branch' }],
    ['a branch with a tilde', { name: 'n', branch: 'a~1' }],
    ['a branch with a colon', { name: 'n', branch: 'a:b' }],
    ['a branch with a control character', { name: 'n', branch: 'a\u0000b' }],
    ['a remote that is a local path', { name: 'n', remoteUrl: '/home/me/claw' }],
    ['a remote with a file scheme', { name: 'n', remoteUrl: 'file:///x/y' }],
    ['an empty remote', { name: 'n', remoteUrl: '' }],
    ['a null remote', { name: 'n', remoteUrl: null }],
    ['a string instead of an object', 'claw'],
    ['null', null],
    ['an array', [{ name: 'n' }]],
  ])('rejects %s', (_label, input) => {
    expect(repositoryRefSchema.safeParse(input).success).toBe(false);
  });

  it('drops keys it does not know, so a token field is never kept', () => {
    const result = repositoryRefSchema.safeParse({ name: 'claw', token: 'ghp_secret', path: '/x' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ name: 'claw' });
  });

  it('reports the field that broke, for the validation pipe', () => {
    const result = repositoryRefSchema.safeParse({ name: 'n', remoteUrl: 'file:///x' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['remoteUrl']);
  });
});

describe('createThreadSchema repositoryRef (F095)', () => {
  it('stays optional: every existing caller is unchanged', () => {
    const result = createThreadSchema.safeParse({ title: 'x' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.repositoryRef).toBeUndefined();
  });

  it('accepts the nested reference', () => {
    const result = createThreadSchema.safeParse({
      repositoryRef: { name: 'claw', remoteUrl: 'git@github.com:acme/claw.git' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repositoryRef).toEqual({
        name: 'claw',
        remoteUrl: 'https://github.com/acme/claw',
      });
    }
  });

  it('refuses an invalid reference instead of dropping it silently', () => {
    expect(createThreadSchema.safeParse({ repositoryRef: { name: '' } }).success).toBe(false);
    expect(createThreadSchema.safeParse({ repositoryRef: null }).success).toBe(false);
  });
});
