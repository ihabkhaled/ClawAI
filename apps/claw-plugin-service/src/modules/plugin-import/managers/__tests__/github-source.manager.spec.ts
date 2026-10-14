import { ImportErrorCode } from '../../../../common/enums/import-error-code.enum';
import { publicResolver } from '../../../egress/__tests__/egress-test-doubles';
import { SafeEgressManager } from '../../../egress/managers/safe-egress.manager';
import { EgressTransport } from '../../../egress/transports/egress.transport';
import { type EgressSendInput, type EgressSendResult } from '../../../egress/types/egress.types';
import { IMPORT_GITHUB, IMPORT_LIMITS } from '../../constants/plugin-import.constants';
import { parseGithubSource } from '../../utilities/parse-github-source.utility';
import { GithubSourceManager } from '../github-source.manager';

const SHA = 'a'.repeat(40);

class ScriptedGithub extends EgressTransport {
  readonly urls: string[] = [];
  readonly headers: Array<Record<string, string>> = [];

  constructor(private readonly route: (_host: string, path: string) => Partial<EgressSendResult>) {
    super();
  }

  send(input: EgressSendInput): Promise<EgressSendResult> {
    this.urls.push(`${input.host}${input.path}`);
    this.headers.push(input.headers);
    return Promise.resolve({
      status: 200,
      headers: {},
      body: '',
      truncated: false,
      ...this.route(input.host, input.path),
    });
  }
}

function tree(
  entries: Array<{ path: string; size?: number; mode?: string; type?: string }>,
): string {
  return JSON.stringify({
    truncated: false,
    tree: entries.map((e) => ({ mode: '100644', type: 'blob', size: 10, ...e })),
  });
}

function manager(transport: ScriptedGithub): GithubSourceManager {
  return new GithubSourceManager(new SafeEgressManager(publicResolver(), transport));
}

const okRoute =
  (entries: Parameters<typeof tree>[0], bodies: Record<string, string> = {}) =>
  (host: string, path: string): Partial<EgressSendResult> => {
    const api = host === 'api.github.com';
    if (api && path.includes('/commits/')) return { body: SHA };
    return api && path.includes('/git/trees/')
      ? { body: tree(entries) }
      : { body: bodies[decodeURIComponent(path.split(`${SHA}/`)[1] ?? '')] ?? 'file' };
  };

describe('plugin import GitHub source parsing', () => {
  it.each([
    ['owner/repo', { owner: 'owner', repo: 'repo', ref: undefined, subdir: '' }],
    ['owner/repo@v1.2', { owner: 'owner', repo: 'repo', ref: 'v1.2', subdir: '' }],
    [
      'owner/repo/plugins/one',
      { owner: 'owner', repo: 'repo', ref: undefined, subdir: 'plugins/one' },
    ],
    ['https://github.com/o/r.git', { owner: 'o', repo: 'r', ref: undefined, subdir: '' }],
    [
      'https://github.com/o/r/tree/main/plugins/x',
      { owner: 'o', repo: 'r', ref: 'main', subdir: 'plugins/x' },
    ],
    [
      'https://github.com/o/r/blob/main/.claude-plugin/marketplace.json',
      { owner: 'o', repo: 'r', ref: 'main', subdir: '' },
    ],
    [
      'https://raw.githubusercontent.com/o/r/main/plugins/x/.claude-plugin/plugin.json',
      { owner: 'o', repo: 'r', ref: 'main', subdir: 'plugins/x' },
    ],
  ])('reads %s', (input, expected) => {
    expect(parseGithubSource(input)).toEqual(expected);
  });

  it.each([
    'http://github.com/o/r',
    'https://gitlab.com/o/r',
    'https://evil.example.com/o/r',
    'https://github.com.evil.example.com/o/r',
    'https://user:pw@github.com/o/r',
    'https://github.com:8443/o/r',
    'https://localhost/o/r',
    'https://169.254.169.254/latest',
    'file:///etc/passwd',
    'o',
    'o/r/../../etc',
    'o/r@../x',
    '../x/y',
    'o/r with space',
    'https://github.com/o/r/issues/1',
    '',
  ])('refuses %s', (input) => {
    expect(() => parseGithubSource(input)).toThrow();
  });
});

describe('plugin import GitHub source fetching', () => {
  it('pins the commit SHA, calls only the two allow-listed hosts and sends a user agent', async () => {
    const transport = new ScriptedGithub(
      okRoute(
        [
          { path: '.claude-plugin/plugin.json' },
          { path: 'skills/a/SKILL.md' },
          { path: 'src/big.js' },
        ],
        {
          '.claude-plugin/plugin.json': '{"name":"x"}',
        },
      ),
    );

    const result = await manager(transport).fetch(parseGithubSource('o/r'));

    expect(result.commitSha).toBe(SHA);
    expect(result.files.map((f) => f.path)).toEqual([
      '.claude-plugin/plugin.json',
      'skills/a/SKILL.md',
    ]);
    expect(transport.urls[0]).toBe('api.github.com/repos/o/r/commits/HEAD');
    expect(
      transport.urls.slice(2).every((u) => u.startsWith(`raw.githubusercontent.com/o/r/${SHA}`)),
    ).toBe(true);
    expect(transport.headers.every((h) => h['User-Agent'] === IMPORT_GITHUB.userAgent)).toBe(true);
    expect(transport.headers[0]?.['Accept']).toBe('application/vnd.github.sha');
  });

  it('limits a subdirectory import and re-roots the paths', async () => {
    const transport = new ScriptedGithub(
      okRoute([
        { path: 'plugins/one/.claude-plugin/plugin.json' },
        { path: 'plugins/two/skills/b/SKILL.md' },
      ]),
    );
    const result = await manager(transport).fetch(parseGithubSource('o/r/plugins/one'));
    expect(result.files.map((f) => f.path)).toEqual(['.claude-plugin/plugin.json']);
  });

  it('fetches only the marketplace file when the root is a marketplace', async () => {
    const transport = new ScriptedGithub(
      okRoute([
        { path: '.claude-plugin/marketplace.json' },
        { path: 'plugins/one/skills/a/SKILL.md' },
        { path: 'plugins/two/skills/b/SKILL.md' },
      ]),
    );
    const result = await manager(transport).fetch(parseGithubSource('o/r'));
    expect(result.files.map((f) => f.path)).toEqual(['.claude-plugin/marketplace.json']);
  });

  it('skips symlinks, submodules and oversized files', async () => {
    const transport = new ScriptedGithub(
      okRoute([
        { path: 'skills/a/SKILL.md' },
        { path: 'skills/link.md', mode: '120000' },
        { path: 'skills/sub', mode: '160000', type: 'commit' },
        { path: 'skills/huge.md', size: IMPORT_LIMITS.maxStoredFileBytes + 1 },
      ]),
    );
    const result = await manager(transport).fetch(parseGithubSource('o/r'));
    expect(result.files.map((f) => f.path)).toEqual(['skills/a/SKILL.md']);
  });

  it('refuses a source with too many plugin files and one whose tree is truncated', async () => {
    const many = Array.from({ length: IMPORT_GITHUB.maxFiles + 1 }, (_u, i) => ({
      path: `skills/s${String(i)}/SKILL.md`,
    }));
    await expect(
      manager(new ScriptedGithub(okRoute(many))).fetch(parseGithubSource('o/r')),
    ).rejects.toMatchObject({
      importCode: ImportErrorCode.ARCHIVE_TOO_MANY_ENTRIES,
    });
    const truncated = new ScriptedGithub((_host, path) =>
      path.includes('/commits/')
        ? { body: SHA }
        : { body: JSON.stringify({ truncated: true, tree: [] }) },
    );
    await expect(manager(truncated).fetch(parseGithubSource('o/r'))).rejects.toMatchObject({
      importCode: ImportErrorCode.SOURCE_INVALID,
    });
  });

  it('maps 404, rate limiting, redirects and junk answers to stable codes', async () => {
    const run = (route: ConstructorParameters<typeof ScriptedGithub>[0]) =>
      manager(new ScriptedGithub(route)).fetch(parseGithubSource('o/r'));
    await expect(run(() => ({ status: 404 }))).rejects.toMatchObject({
      importCode: ImportErrorCode.SOURCE_NOT_FOUND,
    });
    await expect(run(() => ({ status: 403 }))).rejects.toMatchObject({
      importCode: ImportErrorCode.SOURCE_RATE_LIMITED,
    });
    await expect(
      run(() => ({ status: 302, headers: { location: 'https://evil.example.com/' } })),
    ).rejects.toMatchObject({
      importCode: ImportErrorCode.SOURCE_UNREACHABLE,
    });
    await expect(run(() => ({ body: 'not a sha' }))).rejects.toMatchObject({
      importCode: ImportErrorCode.SOURCE_UNREACHABLE,
    });
    await expect(run(() => ({ truncated: true }))).rejects.toMatchObject({
      importCode: ImportErrorCode.SOURCE_UNREACHABLE,
    });
  });
});
