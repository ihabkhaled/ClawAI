import { parsePluginManifest } from '../../utilities/parse-plugin-manifest.utility';
import { FIRST_PARTY_MANIFESTS } from '../../../seeding/constants/first-party-manifests.constants';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { WEB_FETCH_MANIFEST } from '../../../seeding/constants/manifests/web-fetch.manifest';

type Mutable = Record<string, unknown>;

function manifestWith(mutate: (manifest: Mutable) => void): unknown {
  const copy: Mutable = structuredClone(WEB_FETCH_MANIFEST);
  mutate(copy);
  return copy;
}

function toolOf(manifest: Mutable): Mutable {
  return (manifest['tools'] as Mutable[])[0] as Mutable;
}

function errorsOf(input: unknown): string {
  const result = parsePluginManifest(input);
  return result.ok ? '' : result.errors.join('\n');
}

describe('pluginManifestSchema', () => {
  describe('valid manifests', () => {
    it.each(FIRST_PARTY_MANIFESTS.map((manifest) => [manifest.slug, manifest] as const))(
      'accepts the first-party manifest %s',
      (_slug, manifest) => {
        expect(parsePluginManifest(manifest).ok).toBe(true);
      },
    );

    it('applies defaults for network, auth, scopes and limits', () => {
      const minimal = manifestWith((manifest) => {
        delete manifest['network'];
        delete manifest['auth'];
        delete manifest['scopes'];
        delete manifest['settingsSchema'];
        delete manifest['limits'];
        toolOf(manifest)['scopes'] = [];
      });
      const result = parsePluginManifest(minimal);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.manifest.network).toEqual({ hosts: [], publicWeb: false });
        expect(result.manifest.auth).toEqual({ kind: 'NONE' });
        expect(result.manifest.limits.maxCallsPerTurn).toBe(3);
        expect(result.manifest.settingsSchema['type']).toBe('object');
      }
    });

    it('accepts a curated MCP manifest with https server and api key auth', () => {
      const mcp = manifestWith((manifest) => {
        manifest['runtime'] = {
          kind: 'MCP_REMOTE',
          server: { url: 'https://mcp.example.com/mcp', transport: 'streamable-http' },
        };
        manifest['auth'] = { kind: 'API_KEY', headerName: 'X-Api-Token' };
        (manifest['network'] as Mutable)['publicWeb'] = false;
      });
      expect(parsePluginManifest(mcp).ok).toBe(true);
    });

    it('keeps a multi-line description but rejects a multi-line title', () => {
      const ok = manifestWith((manifest) => {
        toolOf(manifest)['description'] = 'First line.\nSecond line.';
      });
      const bad = manifestWith((manifest) => {
        toolOf(manifest)['title'] = 'Two\nlines';
      });
      expect(parsePluginManifest(ok).ok).toBe(true);
      expect(errorsOf(bad)).toContain('tools.0.title');
    });
  });

  describe('identity fields', () => {
    it.each([
      ['uppercase', 'Web-Fetch'],
      ['too short', 'ab'],
      ['path traversal', '../etc'],
      ['leading hyphen', '-web'],
      ['trailing hyphen', 'web-'],
      ['41 characters', 'a'.repeat(41)],
      ['with a space', 'web fetch'],
      ['reserved route word', 'admin'],
      ['reserved route word installs', 'installs'],
    ])('rejects a slug that is %s', (_label, slug) => {
      expect(errorsOf(manifestWith((manifest) => (manifest['slug'] = slug)))).toContain('slug');
    });

    it.each(['1.0', '1.0.0-beta', 'v1.0.0', '01.0.0', '1.0.0.0', ''])(
      'rejects version %j',
      (version) => {
        expect(errorsOf(manifestWith((manifest) => (manifest['version'] = version)))).toContain(
          'version',
        );
      },
    );

    it('rejects a wrong manifestVersion', () => {
      expect(errorsOf(manifestWith((manifest) => (manifest['manifestVersion'] = 2)))).toContain(
        'manifestVersion',
      );
    });

    it('rejects an unknown top-level key', () => {
      expect(errorsOf(manifestWith((manifest) => (manifest['isAdmin'] = true)))).toContain(
        'isAdmin',
      );
    });

    it('rejects a __proto__ key smuggled in through JSON.parse', () => {
      const hostile: unknown = JSON.parse(
        JSON.stringify(WEB_FETCH_MANIFEST).replace(
          '{"manifestVersion"',
          '{"__proto__":{"x":1},"manifestVersion"',
        ),
      );
      expect(parsePluginManifest(hostile).ok).toBe(false);
    });

    it('rejects a http homepage and a homepage with credentials', () => {
      expect(
        parsePluginManifest(
          manifestWith((manifest) => (manifest['homepageUrl'] = 'http://example.com')),
        ).ok,
      ).toBe(false);
      expect(
        parsePluginManifest(
          manifestWith((manifest) => (manifest['homepageUrl'] = 'https://user:pw@example.com')),
        ).ok,
      ).toBe(false);
    });

    it('rejects bad category and icon keys', () => {
      expect(
        parsePluginManifest(manifestWith((manifest) => (manifest['category'] = 'A B'))).ok,
      ).toBe(false);
      expect(
        parsePluginManifest(manifestWith((manifest) => (manifest['iconKey'] = 'https://x/y.png')))
          .ok,
      ).toBe(false);
    });
  });

  describe('translations', () => {
    it('requires English', () => {
      const result = errorsOf(
        manifestWith((manifest) => {
          delete (manifest['translations'] as Mutable)['en'];
        }),
      );
      expect(result).toContain('translations.en');
    });

    it('rejects a locale outside the 13 supported', () => {
      const result = errorsOf(
        manifestWith((manifest) => {
          (manifest['translations'] as Mutable)['xx'] = (manifest['translations'] as Mutable)['en'];
        }),
      );
      expect(result).toContain('translations');
    });

    it.each([
      ['a bidi override', 'Safe‮evil'],
      ['a zero-width space', 'Safe​name'],
      ['a right-to-left mark', 'Safe‏name'],
      ['a word joiner', 'Safe⁠name'],
      ['a null byte', 'Safe\u0000name'],
      ['a BOM', 'Safe﻿name'],
    ])('rejects a name containing %s', (_label, name) => {
      const result = errorsOf(
        manifestWith((manifest) => {
          const en = (manifest['translations'] as Mutable)['en'] as Mutable;
          en['name'] = name;
        }),
      );
      expect(result).toContain('translations.en.name');
    });

    it('allows the zero-width non-joiner that Persian text needs', () => {
      const persian = manifestWith((manifest) => {
        const en = (manifest['translations'] as Mutable)['en'] as Mutable;
        en['name'] = 'آب‌وهوا';
      });
      expect(parsePluginManifest(persian).ok).toBe(true);
    });

    it('rejects an over-long summary and an empty description', () => {
      const result = errorsOf(
        manifestWith((manifest) => {
          const en = (manifest['translations'] as Mutable)['en'] as Mutable;
          en['summary'] = 'x'.repeat(161);
          en['description'] = '   ';
        }),
      );
      expect(result).toContain('translations.en.summary');
      expect(result).toContain('translations.en.description');
    });
  });

  describe('tools', () => {
    it('requires at least one tool and at most 64', () => {
      expect(errorsOf(manifestWith((manifest) => (manifest['tools'] = [])))).toContain('tools');
      const many = manifestWith((manifest) => {
        const tool = toolOf(manifest);
        manifest['tools'] = Array.from({ length: 65 }, (_unused, index) => ({
          ...tool,
          name: `tool_${index}`,
        }));
      });
      expect(errorsOf(many)).toContain('tools');
    });

    it.each(['Fetch-Page', 'a b', '../x', '', 'x'.repeat(41)])('rejects tool name %j', (name) => {
      expect(errorsOf(manifestWith((manifest) => (toolOf(manifest)['name'] = name)))).toContain(
        'tools.0.name',
      );
    });

    it('rejects duplicate tool names', () => {
      const duplicate = manifestWith((manifest) => {
        manifest['tools'] = [toolOf(manifest), { ...toolOf(manifest) }];
      });
      expect(errorsOf(duplicate)).toContain('tool names must be unique');
    });

    it('rejects a tool description over 1024 characters', () => {
      const long = manifestWith((manifest) => (toolOf(manifest)['description'] = 'x'.repeat(1025)));
      expect(errorsOf(long)).toContain('tools.0.description');
    });

    it('rejects a native tool name over 64 characters', () => {
      const long = manifestWith((manifest) => {
        manifest['slug'] = 'a'.repeat(38);
        toolOf(manifest)['name'] = 'b'.repeat(25);
      });
      expect(errorsOf(long)).toContain('native tool name exceeds 64');
    });

    it('rejects a tool scope that the manifest does not declare', () => {
      const undeclared = manifestWith((manifest) => (toolOf(manifest)['scopes'] = ['write-all']));
      expect(errorsOf(undeclared)).toContain('not declared');
    });

    it('rejects duplicate scope ids', () => {
      const duplicate = manifestWith((manifest) => {
        manifest['scopes'] = [
          { id: 'read', description: 'a' },
          { id: 'read', description: 'b' },
        ];
      });
      expect(errorsOf(duplicate)).toContain('scope ids must be unique');
    });

    it('rejects an unknown risk level and out-of-range limits', () => {
      expect(
        errorsOf(manifestWith((manifest) => (toolOf(manifest)['riskLevel'] = 'SAFE'))),
      ).toContain('tools.0.riskLevel');
      expect(errorsOf(manifestWith((manifest) => (toolOf(manifest)['timeoutMs'] = 10)))).toContain(
        'tools.0.timeoutMs',
      );
      expect(
        errorsOf(manifestWith((manifest) => (toolOf(manifest)['maxResultBytes'] = 99_999_999))),
      ).toContain('tools.0.maxResultBytes');
      expect(
        errorsOf(manifestWith((manifest) => (manifest['limits'] = { maxCallsPerTurn: 0 }))),
      ).toContain('limits.maxCallsPerTurn');
    });

    it('rejects image result kinds in v1', () => {
      expect(
        errorsOf(manifestWith((manifest) => (toolOf(manifest)['resultKind'] = 'image'))),
      ).toContain('tools.0.resultKind');
    });
  });

  describe('input schema safety', () => {
    function withSchema(schema: unknown): string {
      return errorsOf(manifestWith((manifest) => (toolOf(manifest)['inputSchema'] = schema)));
    }

    it('rejects a schema that is not an object type', () => {
      expect(withSchema({ type: 'string' })).toContain('root must have type "object"');
      expect(withSchema([])).toContain('inputSchema');
    });

    it.each([
      [
        'a remote $ref',
        { type: 'object', properties: { a: { $ref: 'https://evil.test/x.json' } } },
      ],
      ['a file $ref', { type: 'object', properties: { a: { $ref: 'file:///etc/passwd' } } }],
      ['an $id', { type: 'object', $id: 'https://evil.test/id' }],
      ['a $dynamicRef', { type: 'object', $dynamicRef: '#x' }],
    ])('rejects %s', (_label, schema) => {
      expect(withSchema(schema)).not.toBe('');
    });

    it('accepts a local $ref', () => {
      expect(
        withSchema({
          type: 'object',
          $defs: { id: { type: 'string' } },
          properties: { a: { $ref: '#/$defs/id' } },
        }),
      ).toBe('');
    });

    it('rejects prototype-polluting keys inside a schema', () => {
      const polluted: unknown = JSON.parse(
        '{"type":"object","properties":{"__proto__":{"type":"string"}}}',
      );
      expect(withSchema(polluted)).toContain('forbidden key');
      const constructorKey: unknown = JSON.parse('{"type":"object","constructor":{}}');
      expect(withSchema(constructorKey)).toContain('forbidden key');
    });

    it('rejects a schema nested more than six subschemas deep', () => {
      let schema: Record<string, unknown> = { type: 'string' };
      for (let level = 0; level < 8; level += 1) {
        schema = { type: 'object', properties: { next: schema } };
      }
      expect(withSchema(schema)).toContain('nested too deeply');
    });

    it('rejects absurdly deep raw JSON without overflowing the stack', () => {
      let schema: Record<string, unknown> = { type: 'string' };
      for (let level = 0; level < 5000; level += 1) schema = { next: schema };
      // Either the depth guard or the serialisation guard stops it; both reject.
      expect(withSchema({ type: 'object', properties: schema })).not.toBe('');
    });

    it('rejects a schema over 16 KB', () => {
      const properties: Record<string, unknown> = {};
      for (let index = 0; index < 120; index += 1) {
        properties[`p${index}`] = { type: 'string', description: 'x'.repeat(200) };
      }
      expect(withSchema({ type: 'object', properties })).toContain('too large');
    });

    it('rejects a schema with too many nodes', () => {
      const properties: Record<string, unknown> = {};
      for (let index = 0; index < 1200; index += 1) properties[`p${index}`] = { type: 'string' };
      expect(withSchema({ type: 'object', properties })).toContain('too many nodes');
    });
  });

  describe('runtime and network', () => {
    function withServer(url: string): string {
      return errorsOf(
        manifestWith((manifest) => {
          manifest['runtime'] = {
            kind: 'MCP_REMOTE',
            server: { url, transport: 'streamable-http' },
          };
          (manifest['network'] as Mutable)['publicWeb'] = false;
        }),
      );
    }

    it.each([
      'http://mcp.example.com/mcp',
      'https://localhost/mcp',
      'https://127.0.0.1/mcp',
      'https://169.254.169.254/latest/meta-data',
      'https://2130706433/mcp',
      'https://[::1]/mcp',
      'https://user:pass@mcp.example.com/mcp',
      'https://mcp.example.com/mcp#frag',
      'https://service.internal/mcp',
      'https://printer.local/mcp',
      'https://intranet/mcp',
      'https://mcp.example.com./mcp',
      'https://service.internal./mcp',
      'https://mcp.example.com:8443/mcp',
      'https://mcp.example.com:80/mcp',
      'https://mcp.example.com:0/mcp',
      'ftp://mcp.example.com',
      'javascript:alert(1)',
      'not a url',
      `https://mcp.example.com/${'a'.repeat(2100)}`,
    ])('rejects the MCP server url %s', (url) => {
      expect(withServer(url)).toContain('runtime');
    });

    it('rejects an unknown transport and an unknown runtime kind', () => {
      const transport = errorsOf(
        manifestWith((manifest) => {
          manifest['runtime'] = {
            kind: 'MCP_REMOTE',
            server: { url: 'https://mcp.example.com', transport: 'stdio' },
          };
        }),
      );
      expect(transport).toContain('runtime');
      expect(
        parsePluginManifest(
          manifestWith(
            (manifest) => (manifest['runtime'] = { kind: 'SHELL', command: 'rm -rf /' }),
          ),
        ).ok,
      ).toBe(false);
    });

    it('rejects an MCP manifest that claims public web access', () => {
      const bad = manifestWith((manifest) => {
        manifest['runtime'] = {
          kind: 'MCP_REMOTE',
          server: { url: 'https://mcp.example.com', transport: 'sse' },
        };
      });
      expect(errorsOf(bad)).toContain('only built-in adapters');
    });

    it.each([
      'http://api.example.com',
      'localhost',
      '10.0.0.1',
      'api.example.com/path',
      'api.example.com:8443',
      'api.example.com:443',
      'api.example.com.',
      'API.example.com',
      '-bad.example.com',
      '*.*.example.com',
      'a.b',
      `${'a'.repeat(64)}.example.com`,
    ])('rejects the network host %s', (host) => {
      const bad = manifestWith((manifest) => {
        (manifest['network'] as Mutable)['hosts'] = [host];
      });
      expect(errorsOf(bad)).toContain('network.hosts');
    });

    it('accepts a wildcard host and rejects more than 16 hosts', () => {
      const wildcard = manifestWith((manifest) => {
        (manifest['network'] as Mutable)['hosts'] = ['*.example.com'];
      });
      expect(parsePluginManifest(wildcard).ok).toBe(true);
      const many = manifestWith((manifest) => {
        (manifest['network'] as Mutable)['hosts'] = Array.from(
          { length: 17 },
          (_unused, index) => `h${index}.example.com`,
        );
      });
      expect(errorsOf(many)).toContain('network.hosts');
    });
  });

  describe('auth', () => {
    function withAuth(auth: unknown): string {
      return errorsOf(manifestWith((manifest) => (manifest['auth'] = auth)));
    }

    it.each([
      'Host',
      'Cookie',
      'Content-Length',
      'Transfer-Encoding',
      'Proxy-Authorization',
      'Connection',
      'Upgrade',
      'Mcp-Session-Id',
      'X-',
      'Bad Header',
      'Sec-Fetch-Mode',
    ])('rejects credential header %s', (headerName) => {
      expect(withAuth({ kind: 'API_KEY', headerName })).toContain('auth');
    });

    it.each(['Authorization', 'X-API-Key', 'Api-Key', 'X-Custom-Token'])(
      'accepts credential header %s',
      (headerName) => {
        expect(withAuth({ kind: 'BEARER_TOKEN', headerName })).toBe('');
      },
    );

    it('requires an https authorize and token url and PKCE for OAuth', () => {
      expect(
        withAuth({
          kind: 'OAUTH2_PKCE',
          oauth: {
            authorizeUrl: 'http://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: [],
            pkce: true,
          },
        }),
      ).toContain('authorizeUrl');
      expect(
        withAuth({
          kind: 'OAUTH2_PKCE',
          oauth: {
            authorizeUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: [],
            pkce: false,
          },
        }),
      ).toContain('pkce');
      expect(
        withAuth({
          kind: 'OAUTH2_PKCE',
          oauth: {
            authorizeUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: ['read'],
            pkce: true,
          },
        }),
      ).toBe('');
    });

    it('rejects an unknown auth kind and extra keys on NONE', () => {
      expect(withAuth({ kind: 'BASIC' })).toContain('auth');
      expect(withAuth({ kind: 'NONE', headerName: 'Authorization' })).toContain('auth');
    });
  });

  describe('settings schema', () => {
    it('accepts the weather units setting', () => {
      expect(parsePluginManifest(WEATHER_MANIFEST).ok).toBe(true);
    });

    it('rejects a settings schema with a remote $ref', () => {
      const bad = manifestWith((manifest) => {
        manifest['settingsSchema'] = {
          type: 'object',
          properties: { a: { $ref: 'https://x.test/y' } },
        };
      });
      expect(errorsOf(bad)).toContain('settingsSchema');
    });
  });

  describe('parsePluginManifest input guards', () => {
    it.each([null, undefined, 'a string', 42, [], true])('rejects non-object input %j', (input) => {
      expect(parsePluginManifest(input).ok).toBe(false);
    });

    it('rejects input that cannot be serialised', () => {
      const circular: Mutable = {};
      circular['self'] = circular;
      expect(errorsOf(circular)).toContain('not serialisable');
      expect(errorsOf(BigInt(1))).toContain('not serialisable');
    });

    it('rejects a manifest over 256 KB before parsing it', () => {
      const huge = manifestWith((manifest) => {
        manifest['padding'] = 'x'.repeat(300_000);
      });
      expect(errorsOf(huge)).toContain('too large');
    });
  });
});
