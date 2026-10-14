import { ImportComponentKind } from '../../../../common/enums/import-component-kind.enum';
import { ImportErrorCode } from '../../../../common/enums/import-error-code.enum';
import { ImportSupport } from '../../../../common/enums/import-support.enum';
import {
  aiPsychiatryLayout,
  akinatorLayout,
  file,
  iHaveHeadacheLayout,
  STATS,
} from '../../__tests__/plugin-fixtures';
import { IMPORT_LIMITS } from '../../constants/plugin-import.constants';
import { type BundleFile, type ImportPreview } from '../../types/plugin-import.types';
import { computeBundleChecksum } from '../compute-bundle-checksum.utility';
import { parsePluginBundle } from '../parse-plugin-bundle.utility';

function plugin(files: BundleFile[], extra: { subdir?: string; stripWrapper?: boolean } = {}) {
  const result = parsePluginBundle({
    files,
    fallbackName: 'fallback-name',
    stripWrapper: extra.stripWrapper ?? false,
    subdir: extra.subdir,
    stats: STATS,
  });
  if (result.kind !== 'PLUGIN') throw new Error('expected a plugin');
  return result.bundle;
}

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return (error as { importCode?: string }).importCode;
  }
  return undefined;
}

const byKind = (preview: ImportPreview, kind: ImportComponentKind) =>
  preview.components.filter((component) => component.kind === kind);

describe('plugin import manifest parser: real-shaped fixtures', () => {
  it('reads the i-have-headache layout: skill and commands inert, hooks never supported', () => {
    const { preview, files } = plugin(iHaveHeadacheLayout());

    expect(preview).toMatchObject({
      format: 'CLAUDE',
      name: 'i-have-headache',
      version: '1.2.0',
      author: 'Owner',
      license: 'MIT',
      risk: 'HIGH',
    });
    expect(byKind(preview, ImportComponentKind.SKILL)).toEqual([
      expect.objectContaining({
        name: 'i-have-headache',
        support: ImportSupport.STORED_INERT,
        reasonKey: 'no-skills-store',
      }),
    ]);
    expect(
      byKind(preview, ImportComponentKind.COMMAND)
        .map((c) => c.name)
        .sort(),
    ).toEqual(['headache', 'relief']);
    expect(
      byKind(preview, ImportComponentKind.HOOK)
        .map((c) => c.name)
        .sort(),
    ).toEqual(['SessionStart', 'UserPromptSubmit']);
    expect(
      byKind(preview, ImportComponentKind.HOOK).every(
        (c) => c.support === ImportSupport.NOT_SUPPORTED,
      ),
    ).toBe(true);
    expect(preview.warnings).toContain('hooks-not-run');
    expect(files.map((f) => f.path)).not.toContain('hooks/hooks.json');
  });

  it('reads the akinator layout: a remote MCP server is usable, a stdio one is not, secrets are dropped', () => {
    const { preview, files } = plugin(akinatorLayout());

    const servers = byKind(preview, ImportComponentKind.MCP_SERVER);
    expect(servers.find((s) => s.name === 'remote')).toMatchObject({
      support: ImportSupport.USABLE,
      url: 'https://mcp.example.com/mcp',
    });
    expect(servers.find((s) => s.name === 'local')).toMatchObject({
      support: ImportSupport.NOT_SUPPORTED,
      reasonKey: 'stdio',
    });
    expect(preview.warnings).toContain('stdio-not-run');
    expect(byKind(preview, ImportComponentKind.AGENT)).toHaveLength(1);
    expect(files.map((f) => f.path)).not.toContain('.mcp.json');
    expect(JSON.stringify(preview)).not.toContain('SECRET');
    expect(files.map((f) => f.path)).toContain('skills/akinator/references/questions.md');
  });

  it('reads the ai-psychiatry layout: a string author and several skills', () => {
    const { preview } = plugin(aiPsychiatryLayout());

    expect(preview.author).toBe('Dr. Owner');
    expect(
      byKind(preview, ImportComponentKind.SKILL)
        .map((c) => c.name)
        .sort(),
    ).toEqual(['all-the-medicine', 'second-opinion']);
  });

  it('reads the ClawAI clawai-plugin.json format', () => {
    const { preview } = plugin([
      file('clawai-plugin.json', {
        name: 'claw-native',
        version: '3.0.0',
        mcpServers: { api: { url: 'https://api.example.com/mcp' } },
      }),
    ]);

    expect(preview.format).toBe('CLAWAI');
    expect(byKind(preview, ImportComponentKind.MCP_SERVER)[0]).toMatchObject({
      support: ImportSupport.USABLE,
    });
    expect(preview.risk).toBe('MEDIUM');
  });

  it('accepts a bare folder with only a skill, naming it from the source', () => {
    const { preview } = plugin([file('skills/x/SKILL.md', '# x\nhello')]);

    expect(preview).toMatchObject({
      format: 'BARE',
      name: 'fallback-name',
      version: '0.0.0',
      risk: 'LOW',
    });
    expect(preview.warnings).toEqual(expect.arrayContaining(['no-manifest', 'name-from-source']));
  });

  it('strips a single archive wrapper folder and finds a nested plugin', () => {
    const wrapped = iHaveHeadacheLayout().map((f) => ({ ...f, path: `repo-main/${f.path}` }));
    expect(plugin(wrapped, { stripWrapper: true }).preview.name).toBe('i-have-headache');

    const nested = iHaveHeadacheLayout().map((f) => ({ ...f, path: `plugins/one/${f.path}` }));
    expect(plugin(nested).preview.name).toBe('i-have-headache');
  });

  it('keeps a lone skills/ folder when stripping wrappers (it is not a wrapper)', () => {
    const { preview } = plugin([file('skills/x/SKILL.md', '# x')], { stripWrapper: true });
    expect(byKind(preview, ImportComponentKind.SKILL)).toHaveLength(1);
  });

  it('returns marketplace candidates and imports a chosen subdirectory', () => {
    const marketplace = file('.claude-plugin/marketplace.json', {
      name: 'market',
      plugins: [
        { name: 'one', source: './plugins/one', description: 'First' },
        { name: 'far', source: { source: 'github', repo: 'owner/other-repo' } },
        { name: 'bad', source: { source: 'url', url: 'https://evil.example.com/x.git' } },
      ],
    });
    const result = parsePluginBundle({
      files: [marketplace],
      fallbackName: 'm',
      stripWrapper: false,
      stats: STATS,
    });
    expect(result).toEqual({
      kind: 'MARKETPLACE',
      name: 'market',
      candidates: [
        { name: 'one', description: 'First', subdir: 'plugins/one' },
        { name: 'far', description: '', github: 'owner/other-repo' },
      ],
    });

    const files = [
      marketplace,
      ...iHaveHeadacheLayout().map((f) => ({ ...f, path: `plugins/one/${f.path}` })),
    ];
    expect(plugin(files, { subdir: 'plugins/one' }).preview.name).toBe('i-have-headache');
  });

  it('says so when there is nothing to import', () => {
    expect(codeOf(() => plugin([file('README.md', 'hi')]))).toBe(ImportErrorCode.NO_PLUGIN_FOUND);
    expect(codeOf(() => plugin([file('.claude-plugin/marketplace.json', { plugins: [] })]))).toBe(
      ImportErrorCode.NO_PLUGIN_FOUND,
    );
  });
});

describe('plugin import manifest parser: hostile manifests', () => {
  it('refuses prototype-pollution keys anywhere in the manifest', () => {
    const polluted = Buffer.from('{"name":"x","a":{"__proto__":{"admin":true}}}');
    expect(codeOf(() => plugin([{ path: 'clawai-plugin.json', content: polluted }]))).toBe(
      ImportErrorCode.MANIFEST_FORBIDDEN_KEY,
    );
    const ctor = Buffer.from(
      '{"name":"x","mcpServers":{"constructor":{"url":"https://a.example.com"}}}',
    );
    expect(codeOf(() => plugin([{ path: 'clawai-plugin.json', content: ctor }]))).toBe(
      ImportErrorCode.MANIFEST_FORBIDDEN_KEY,
    );
  });

  it('refuses a huge manifest, a deeply nested one and invalid JSON or UTF-8', () => {
    const huge = Buffer.from(
      JSON.stringify({ name: 'x', pad: 'a'.repeat(IMPORT_LIMITS.maxManifestBytes) }),
    );
    expect(codeOf(() => plugin([{ path: 'clawai-plugin.json', content: huge }]))).toBe(
      ImportErrorCode.MANIFEST_TOO_LARGE,
    );
    const deep = Buffer.from(`${'['.repeat(200)}${']'.repeat(200)}`);
    expect(codeOf(() => plugin([{ path: 'clawai-plugin.json', content: deep }]))).toBe(
      ImportErrorCode.MANIFEST_TOO_DEEP,
    );
    expect(
      codeOf(() => plugin([{ path: 'clawai-plugin.json', content: Buffer.from('{nope') }])),
    ).toBe(ImportErrorCode.MANIFEST_INVALID);
    expect(
      codeOf(() =>
        plugin([{ path: 'clawai-plugin.json', content: Buffer.from([0x7b, 0xff, 0x7d]) }]),
      ),
    ).toBe(ImportErrorCode.NON_UTF8);
    expect(codeOf(() => plugin([file('clawai-plugin.json', '[1,2]')]))).toBe(
      ImportErrorCode.MANIFEST_INVALID,
    );
  });

  it('counts brackets inside strings as text, not nesting', () => {
    const { preview } = plugin([
      file('clawai-plugin.json', { name: '[[[[[[[[[[[[[[[[[[[[[[[[[ ok' }),
    ]);
    expect(preview.name).toContain('ok');
  });

  it('refuses path traversal in declared component paths', () => {
    for (const bad of ['../../etc', '/abs/path', 'a/../../b']) {
      expect(codeOf(() => plugin([file('clawai-plugin.json', { name: 'x', commands: bad })]))).toBe(
        ImportErrorCode.PATH_UNSAFE,
      );
    }
    expect(
      codeOf(() =>
        plugin([file('clawai-plugin.json', { name: 'x', skills: ['./ok', '../escape'] })]),
      ),
    ).toBe(ImportErrorCode.PATH_UNSAFE);
  });

  it('rejects non-UTF-8 inside a kept component file', () => {
    const bad = { path: 'skills/x/SKILL.md', content: Buffer.from([0x23, 0xff, 0xfe]) };
    expect(codeOf(() => plugin([bad]))).toBe(ImportErrorCode.NON_UTF8);
  });

  it('imports a SKILL.md at the root as a one-skill plugin named from its front matter', () => {
    const { preview, files } = plugin([
      file(
        'SKILL.md',
        ['---', 'name: My Skill', 'description: Does a thing', '---', 'Body'].join(
          String.fromCodePoint(10),
        ),
      ),
    ]);

    expect(preview.name).toBe('My Skill');
    expect(preview.components).toHaveLength(1);
    expect(preview.components[0]).toMatchObject({ kind: 'SKILL', description: 'Does a thing' });
    expect(files.map((f) => f.path)).toEqual(['skills/My-Skill/SKILL.md']);
  });

  it('names a root SKILL.md plugin from the source when it has no front matter name', () => {
    expect(plugin([file('SKILL.md', '# Hello')]).preview.name).toBe('fallback-name');
  });

  it('refuses a NUL byte in a stored document with a coded error', () => {
    const nul = String.fromCodePoint(0);
    expect(codeOf(() => plugin([file('skills/x/SKILL.md', `a${nul}b`)]))).toBe(
      ImportErrorCode.CONTENT_INVALID,
    );
  });

  it('keeps Persian ZWNJ and emoji ZWJ but strips bidi overrides and zero-width spaces', () => {
    const zwnj = String.fromCodePoint(0x200c);
    const description = `می${zwnj}خواهم ${String.fromCodePoint(0x202e)}x${String.fromCodePoint(0x200b)}y 👨${String.fromCodePoint(0x200d)}👩`;
    const { preview } = plugin([file('clawai-plugin.json', { name: 'p', description })]);

    expect(preview.description).toBe(`می${zwnj}خواهم xy 👨${String.fromCodePoint(0x200d)}👩`);
  });

  it('shows RTL, emoji and over-long names safely, without bidi controls', () => {
    const long = 'x'.repeat(500);
    const { preview } = plugin([
      file('clawai-plugin.json', {
        name: [
          'إضافة',
          String.fromCodePoint(0x202e),
          ' 🚀',
          String.fromCodePoint(7),
          ' ',
          long,
        ].join(''),
        description: 'd'.repeat(5000),
        author: { name: `${String.fromCodePoint(0x2066)}evil${String.fromCodePoint(0x2069)}` },
      }),
    ]);

    expect([...preview.name].length).toBeLessThanOrEqual(IMPORT_LIMITS.maxNameLength);
    expect(
      [...preview.name].some((c) => [0x202e, 0x2066, 0x2069, 7].includes(c.codePointAt(0) ?? 0)),
    ).toBe(false);
    expect(preview.name.startsWith('إضافة 🚀')).toBe(true);
    expect([...preview.description].length).toBeLessThanOrEqual(IMPORT_LIMITS.maxDescriptionLength);
    expect(preview.author).toBe('evil');
  });

  it('does not split an emoji when cutting by length', () => {
    const { preview } = plugin([file('clawai-plugin.json', { name: '🚀'.repeat(200) })]);
    expect(preview.name.endsWith('…')).toBe(true);
    expect(
      [...preview.name].some((c) => [0x202e, 0x2066, 0x2069, 7].includes(c.codePointAt(0) ?? 0)),
    ).toBe(false);
  });

  it('keeps one of two components with the same name and says so', () => {
    const { preview } = plugin([
      file('skills/a/SKILL.md', '---\nname: Same\n---\nx'),
      file('skills/b/SKILL.md', '---\nname: same\n---\ny'),
    ]);
    expect(byKind(preview, ImportComponentKind.SKILL)).toHaveLength(1);
    expect(preview.warnings).toContain('duplicate-component-name');
  });

  it('caps components per kind', () => {
    const many = Array.from({ length: IMPORT_LIMITS.maxComponentsPerKind + 5 }, (_u, i) =>
      file(`commands/c${String(i)}.md`, 'x'),
    );
    const { preview } = plugin(many);
    expect(byKind(preview, ImportComponentKind.COMMAND)).toHaveLength(
      IMPORT_LIMITS.maxComponentsPerKind,
    );
    expect(preview.warnings).toContain('component-limit');
  });

  it('does not let a __proto__ front-matter line pollute anything', () => {
    const { preview } = plugin([
      file('skills/x/SKILL.md', '---\n__proto__: polluted\nname: safe\n---\nbody'),
    ]);
    expect(byKind(preview, ImportComponentKind.SKILL)[0]?.name).toBe('safe');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('treats a non-https, credentialed or malformed MCP URL as not usable', () => {
    const { preview } = plugin([
      file('.mcp.json', {
        mcpServers: {
          plain: { url: 'http://a.example.com/mcp' },
          creds: { url: 'https://user:pw@a.example.com/mcp' },
          junk: { url: 'not a url' },
          legacy: { type: 'sse', url: 'https://a.example.com/sse' },
          scalar: 'oops',
        },
      }),
      file('skills/x/SKILL.md', '# x'),
    ]);
    const servers = byKind(preview, ImportComponentKind.MCP_SERVER);
    expect(servers.map((s) => s.support)).toEqual(Array(5).fill(ImportSupport.NOT_SUPPORTED));
    expect(servers.find((s) => s.name === 'legacy')?.reasonKey).toBe('sse');
  });
});

describe('plugin import checksum', () => {
  it('changes when a kept file or a component changes, and not when order changes', () => {
    const a = plugin(iHaveHeadacheLayout());
    const reordered = plugin([...iHaveHeadacheLayout()].reverse());
    expect(computeBundleChecksum(a.files, a.preview)).toBe(
      computeBundleChecksum(reordered.files, reordered.preview),
    );

    const edited = plugin(
      iHaveHeadacheLayout().map((f) =>
        f.path === 'commands/relief.md' ? file(f.path, 'Different.') : f,
      ),
    );
    expect(computeBundleChecksum(edited.files, edited.preview)).not.toBe(
      computeBundleChecksum(a.files, a.preview),
    );
  });
});
