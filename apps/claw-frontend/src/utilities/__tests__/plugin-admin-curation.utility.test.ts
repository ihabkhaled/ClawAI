import type { CuratedPreviewView } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/services/shared/api-client';
import type { CuratedFormValues } from '@/types/plugin-admin-curation.types';
import {
  adminCurationErrorKey,
  buildEntryRequest,
  buildPreviewRequest,
  emptyCuratedForm,
  parsePlanSlugs,
  toolsFromPreview,
} from '@/utilities/plugin-admin-curation.utility';

function filled(overrides: Partial<CuratedFormValues> = {}): CuratedFormValues {
  return {
    ...emptyCuratedForm(),
    slug: ' vendor-docs ',
    publisher: ' Vendor ',
    url: ' https://mcp.vendor.example.com/mcp ',
    texts: {
      en: { name: 'Vendor Docs', summary: 'Docs.', description: 'Docs search.' },
      de: { name: '', summary: '', description: '' },
      fr: { name: 'Doc Vendor', summary: 'Doc.', description: 'Recherche.' },
    },
    tools: [
      {
        name: 'search_docs',
        description: 'Search.',
        riskLevel: 'READ',
        selected: true,
        curatable: true,
      },
      {
        name: 'drop_all',
        description: 'Drop.',
        riskLevel: 'DESTRUCTIVE',
        selected: false,
        curatable: true,
      },
    ],
    ...overrides,
  };
}

describe('catalog curation request builders', () => {
  it('sends the slug on create only, trimmed, and only the selected tools', () => {
    const created = buildEntryRequest(filled(), false, false);
    const edited = buildEntryRequest(filled(), true, true);

    expect(created.slug).toBe('vendor-docs');
    expect(created.publisher).toBe('Vendor');
    expect(created.server.url).toBe('https://mcp.vendor.example.com/mcp');
    expect(created.tools.map((tool) => tool.name)).toEqual(['search_docs']);
    expect(created.publish).toBe(false);
    expect('slug' in edited).toBe(false);
    expect(edited.publish).toBe(true);
  });

  it('sends only the languages that have a name', () => {
    expect(Object.keys(buildEntryRequest(filled(), false, false).translations).sort()).toEqual([
      'en',
      'fr',
    ]);
  });

  it('sends the probe key only when one was typed, and never in the tool list', () => {
    const without = buildEntryRequest(filled(), false, false);
    const withKey = buildEntryRequest(
      filled({ authKind: 'API_KEY', probeCredential: 'sk-secret-0123456789' }),
      false,
      true,
    );

    expect('probeCredential' in without).toBe(false);
    expect(withKey.probeCredential).toBe('sk-secret-0123456789');
    expect(JSON.stringify(withKey.tools)).not.toContain('sk-secret');
  });

  it('builds the auth block for each key type', () => {
    expect(buildEntryRequest(filled(), false, false).auth).toEqual({ kind: 'NONE' });
    expect(
      buildEntryRequest(
        filled({ authKind: 'BEARER_TOKEN', headerName: 'Authorization' }),
        false,
        false,
      ).auth,
    ).toEqual({ kind: 'BEARER_TOKEN', headerName: 'Authorization' });
    expect(
      buildEntryRequest(
        filled({
          authKind: 'OAUTH2_PKCE',
          oauthAuthorizeUrl: 'https://login.example.com/authorize',
          oauthTokenUrl: 'https://login.example.com/token',
        }),
        false,
        false,
      ).auth,
    ).toMatchObject({ kind: 'OAUTH2_PKCE', oauth: { scopes: [] } });
  });

  it('turns the plan field into a clean list', () => {
    expect(parsePlanSlugs(' Pro, max ,, FREE ')).toEqual(['pro', 'max', 'free']);
    expect(parsePlanSlugs('')).toEqual([]);
    expect(buildPreviewRequest(filled()).url).toBe('https://mcp.vendor.example.com/mcp');
  });

  it('replaces the tools with the preview, keeping the earlier risk and refusing unusable names', () => {
    const preview: CuratedPreviewView = {
      serverName: 'Vendor',
      latencyMs: 40,
      skipped: [],
      ignored: 0,
      tools: [
        {
          name: 'search_docs',
          description: 'Search.',
          inputSchema: { type: 'object' },
          defaultRisk: 'WRITE',
          curatable: true,
        },
        {
          name: 'Bad-Name',
          description: 'x',
          inputSchema: { type: 'object' },
          defaultRisk: 'WRITE',
          curatable: false,
        },
      ],
    };

    const tools = toolsFromPreview(preview, filled().tools);

    expect(tools).toHaveLength(2);
    expect(tools[0]).toMatchObject({ name: 'search_docs', riskLevel: 'READ', selected: true });
    expect(tools[1]).toMatchObject({
      name: 'Bad-Name',
      riskLevel: 'WRITE',
      selected: false,
      curatable: false,
    });
  });
});

describe('adminCurationErrorKey', () => {
  it('maps a curation code to its message and everything else to the generic one', () => {
    const coded = new ApiClientError({
      message: 'x',
      status: 422,
      code: 'PLUGIN_CURATION_URL_BLOCKED',
    });

    expect(adminCurationErrorKey(coded)).toBe('pluginsAdminCatalog.errors.urlBlocked');
    expect(adminCurationErrorKey(new Error('boom'))).toBe('pluginsAdminCatalog.errors.generic');
  });
});
