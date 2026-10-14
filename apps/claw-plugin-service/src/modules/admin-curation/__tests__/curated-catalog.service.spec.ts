import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CatalogHealthStatus } from '../../../common/enums/catalog-health-status.enum';
import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { HostRuleKind } from '../../../common/enums/host-rule-kind.enum';
import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type HostRuleRecord } from '../../host-rules/types/host-rules.types';
import {
  ADMIN,
  auditActions,
  buildHarness,
  curatedBody,
  errorCodeOf,
  SEARCH_TOOL,
} from './curation-fixtures';

const DENY_VENDOR: HostRuleRecord = {
  id: 'r1',
  kind: HostRuleKind.DENY,
  match: HostRuleMatch.HOST,
  pattern: 'vendor.example.com',
  note: null,
  createdBy: ADMIN,
  createdAt: new Date('2026-10-15T09:00:00.000Z'),
};

describe('admin catalog curation: CuratedCatalogService', () => {
  describe('create', () => {
    it('saves a draft that is not probed, off, and writes an audit row', async () => {
      const harness = buildHarness();

      const view = await harness.service.create(ADMIN, curatedBody());

      expect(view).toMatchObject({
        slug: 'vendor-docs',
        status: CatalogStatus.DRAFT,
        globallyEnabled: false,
        version: '1.0.0',
        url: 'https://mcp.vendor.example.com/mcp',
        needsVerification: false,
      });
      expect(harness.transport.seen).toHaveLength(0);
      expect(auditActions(harness)).toEqual(['CATALOG_CREATED']);
      expect(harness.auditRepository.write.mock.calls[0]?.[0]).toMatchObject({
        actorId: ADMIN,
        targetId: 'vendor-docs',
      });
    });

    it('publishing probes the server and takes the description and schema the server listed', async () => {
      const harness = buildHarness();

      const view = await harness.service.create(ADMIN, curatedBody({ publish: true }));

      expect(view).toMatchObject({ status: CatalogStatus.PUBLISHED, globallyEnabled: true });
      expect(harness.transport.seen.map((request) => request.method)).toContain('tools/list');
      const stored = harness.repository.records.get('vendor-docs');
      const manifest = stored?.current?.manifest as {
        tools: Array<{ description: string; inputSchema: { required?: string[] } }>;
      };
      expect(manifest.tools[0]?.description).toBe(SEARCH_TOOL.description);
      expect(manifest.tools[0]?.inputSchema.required).toEqual(['q']);
    });

    it('refuses to publish a tool the server does not list (422 TOOLS_UNVERIFIED)', async () => {
      const harness = buildHarness({ tools: [SEARCH_TOOL] });
      const body = curatedBody({
        publish: true,
        tools: [
          { name: 'delete_everything', description: 'Nope.', riskLevel: RiskLevel.DESTRUCTIVE },
        ],
      });

      expect(await errorCodeOf(harness.service.create(ADMIN, body))).toBe(
        CurationErrorCode.TOOLS_UNVERIFIED,
      );
      expect(harness.repository.records.size).toBe(0);
      expect(auditActions(harness)).toEqual([]);
    });

    it('refuses to publish an OAuth entry because the runtime has no OAuth yet', async () => {
      const harness = buildHarness();
      const body = curatedBody({
        publish: true,
        auth: {
          kind: AuthKind.OAUTH2_PKCE,
          oauth: {
            authorizeUrl: 'https://login.vendor.example.com/authorize',
            tokenUrl: 'https://login.vendor.example.com/token',
            scopes: [],
          },
        },
      });

      expect(await errorCodeOf(harness.service.create(ADMIN, body))).toBe(
        CurationErrorCode.OAUTH_UNSUPPORTED,
      );
    });

    it('stores an OAuth placeholder as a draft', async () => {
      const harness = buildHarness();
      const body = curatedBody({
        auth: {
          kind: AuthKind.OAUTH2_PKCE,
          oauth: {
            authorizeUrl: 'https://login.vendor.example.com/authorize',
            tokenUrl: 'https://login.vendor.example.com/token',
            scopes: [],
          },
        },
      });

      expect((await harness.service.create(ADMIN, body)).authKind).toBe(AuthKind.OAUTH2_PKCE);
    });

    it('answers 409 SLUG_TAKEN for a slug that exists, even a soft-deleted one', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody());
      await harness.service.remove(ADMIN, 'vendor-docs');

      expect(await errorCodeOf(harness.service.create(ADMIN, curatedBody()))).toBe(
        CurationErrorCode.SLUG_TAKEN,
      );
    });

    it('answers 403 HOST_DENIED when a deny rule covers the host, before any connection', async () => {
      const harness = buildHarness({ tools: [SEARCH_TOOL] }, [DENY_VENDOR]);

      expect(await errorCodeOf(harness.service.create(ADMIN, curatedBody({ publish: true })))).toBe(
        CurationErrorCode.HOST_DENIED,
      );
      expect(harness.transport.seen).toHaveLength(0);
    });

    it('answers 403 HOST_DENIED for a denied publisher and for a slug outside an allow-list', async () => {
      const denyPublisher: HostRuleRecord = {
        ...DENY_VENDOR,
        match: HostRuleMatch.PUBLISHER,
        pattern: 'vendor',
      };
      const allowOther: HostRuleRecord = {
        ...DENY_VENDOR,
        id: 'r2',
        kind: HostRuleKind.ALLOW,
        match: HostRuleMatch.SLUG,
        pattern: 'something-else',
      };

      expect(
        await errorCodeOf(
          buildHarness({ tools: [SEARCH_TOOL] }, [denyPublisher]).service.create(
            ADMIN,
            curatedBody(),
          ),
        ),
      ).toBe(CurationErrorCode.HOST_DENIED);
      expect(
        await errorCodeOf(
          buildHarness({ tools: [SEARCH_TOOL] }, [allowOther]).service.create(ADMIN, curatedBody()),
        ),
      ).toBe(CurationErrorCode.HOST_DENIED);
    });

    it('answers 422 MANIFEST_INVALID with the field problems for hostile text', async () => {
      const harness = buildHarness();
      const body = curatedBody({
        translations: {
          en: { name: 'Bad‮name', summary: 'ok', description: 'ok' },
        },
      });

      expect(await errorCodeOf(harness.service.create(ADMIN, body))).toBe(
        CurationErrorCode.MANIFEST_INVALID,
      );
    });

    it('keeps locale-aware names: other locales are stored next to English', async () => {
      const harness = buildHarness();
      const body = curatedBody({
        translations: {
          en: { name: 'Vendor Docs', summary: 'Docs.', description: 'Docs search.' },
          de: { name: 'Vendor-Doku', summary: 'Doku.', description: 'Doku-Suche.' },
        },
      });

      const view = await harness.service.create(ADMIN, body);

      expect(view.translations['de']?.name).toBe('Vendor-Doku');
    });
  });

  describe('update', () => {
    it('adds a patch version only when the manifest changed, keeping the admin tool disables', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody());
      const record = harness.repository.records.get('vendor-docs');
      if (record?.current !== undefined && record.current !== null) {
        record.current.tools[0] = {
          name: 'search_docs',
          riskLevel: RiskLevel.READ,
          disabledByAdmin: true,
        };
      }

      const same = await harness.service.update(ADMIN, 'vendor-docs', {
        ...curatedBody(),
        adminNotes: 'only a note changed',
      });
      const changed = await harness.service.update(ADMIN, 'vendor-docs', {
        ...curatedBody(),
        publisher: 'Vendor Inc',
      });

      expect(same.version).toBe('1.0.0');
      expect(same.adminNotes).toBe('only a note changed');
      expect(changed.version).toBe('1.0.1');
      expect(changed.tools[0]?.disabledByAdmin).toBe(true);
      expect(auditActions(harness)).toEqual([
        'CATALOG_CREATED',
        'CATALOG_UPDATED',
        'CATALOG_UPDATED',
      ]);
    });

    it('publishing an unverified seed draft clears needsVerification only after a good probe', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody());
      const record = harness.repository.records.get('vendor-docs');
      if (record !== undefined) record.needsVerification = true;

      const stillDraft = await harness.service.update(ADMIN, 'vendor-docs', curatedBody());
      const published = await harness.service.update(
        ADMIN,
        'vendor-docs',
        curatedBody({ publish: true }),
      );

      expect(stillDraft.needsVerification).toBe(true);
      expect(published).toMatchObject({
        needsVerification: false,
        status: CatalogStatus.PUBLISHED,
      });
    });

    it('answers 404 for an unknown slug and 409 NOT_CURATED for a first-party entry', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody());
      const record = harness.repository.records.get('vendor-docs');
      if (record !== undefined) record.source = CatalogSource.FIRST_PARTY;

      expect(await errorCodeOf(harness.service.update(ADMIN, 'nope-nope', curatedBody()))).toBe(
        CurationErrorCode.NOT_FOUND,
      );
      expect(await errorCodeOf(harness.service.update(ADMIN, 'vendor-docs', curatedBody()))).toBe(
        CurationErrorCode.NOT_CURATED,
      );
    });
  });

  describe('enable, disable and soft delete', () => {
    it('will not switch on a draft or an unverified entry, and audits each switch', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody());

      expect(await errorCodeOf(harness.service.setEnabled(ADMIN, 'vendor-docs', true))).toBe(
        CurationErrorCode.NEEDS_VERIFICATION,
      );

      await harness.service.update(ADMIN, 'vendor-docs', curatedBody({ publish: true }));
      const on = await harness.service.setEnabled(ADMIN, 'vendor-docs', true);
      const off = await harness.service.setEnabled(ADMIN, 'vendor-docs', false);

      expect(on.globallyEnabled).toBe(true);
      expect(off.globallyEnabled).toBe(false);
      expect(auditActions(harness)).toEqual([
        'CATALOG_CREATED',
        'CATALOG_UPDATED',
        'CATALOG_ENABLED',
        'CATALOG_DISABLED',
      ]);
    });

    it('soft delete hides the entry, keeps the row and the slug, and audits it', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody({ publish: true }));

      await harness.service.remove(ADMIN, 'vendor-docs');

      const row = harness.repository.records.get('vendor-docs');
      expect(row).toMatchObject({ status: CatalogStatus.HIDDEN, globallyEnabled: false });
      expect(row?.deletedAt).not.toBeNull();
      expect(await harness.service.list(false)).toHaveLength(0);
      expect(await harness.service.list(true)).toHaveLength(1);
      expect(await errorCodeOf(harness.service.remove(ADMIN, 'vendor-docs'))).toBe(
        CurationErrorCode.NOT_FOUND,
      );
      expect(auditActions(harness)).toEqual(['CATALOG_CREATED', 'CATALOG_DELETED']);
    });
  });

  describe('preview and health', () => {
    it('previews the listed tools with WRITE as the default risk and flags names a curated entry cannot use', async () => {
      const harness = buildHarness({
        tools: [SEARCH_TOOL, { ...SEARCH_TOOL, name: 'Fetch-Page' }, { name: '../x' }],
      });

      const preview = await harness.service.preview({
        url: 'https://mcp.vendor.example.com/mcp',
        transport: 'streamable-http' as never,
        auth: { kind: AuthKind.NONE },
      });

      expect(preview.serverName).toBe('Fake MCP');
      expect(preview.tools.map((tool) => [tool.name, tool.defaultRisk, tool.curatable])).toEqual([
        ['search_docs', RiskLevel.WRITE, true],
        ['Fetch-Page', RiskLevel.WRITE, false],
      ]);
      expect(preview.skipped).toHaveLength(1);
    });

    it('the preview credential goes to the server as a header and is never kept', async () => {
      const harness = buildHarness();

      await harness.service.preview({
        url: 'https://mcp.vendor.example.com/mcp',
        transport: 'streamable-http' as never,
        auth: { kind: AuthKind.API_KEY, headerName: 'X-API-Key' },
        credential: 'sk-probe-secret-0123456789',
      });

      expect(
        harness.transport.seen.every(
          (r) => r.headers['X-API-Key'] === 'sk-probe-secret-0123456789',
        ),
      ).toBe(true);
      expect(JSON.stringify(harness.auditRepository.write.mock.calls)).not.toContain('sk-probe');
    });

    it('answers 502 PROBE_FAILED when the server is silent', async () => {
      const harness = buildHarness({ hangOn: 'initialize' });

      const code = await errorCodeOf(
        harness.service.preview({
          url: 'https://mcp.vendor.example.com/mcp',
          transport: 'streamable-http' as never,
          auth: { kind: AuthKind.NONE },
        }),
      );

      expect(code).toBe(CurationErrorCode.PROBE_FAILED);
    });

    it('records OK with a latency after a good ping and audits it', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody());

      const view = await harness.service.checkHealth(ADMIN, 'vendor-docs');

      expect(view.health.status).toBe(CatalogHealthStatus.OK);
      expect(view.health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(view.health.checkedAt).not.toBeNull();
      expect(auditActions(harness)).toContain('CATALOG_HEALTH_CHECKED');
    });

    it('records DOWN for a silent server and UNKNOWN AUTH_REQUIRED when a keyed server says no', async () => {
      const down = buildHarness({ hangOn: 'initialize' });
      await down.service.create(ADMIN, curatedBody());
      const keyed = buildHarness({ httpFailure: { initialize: 401 } });
      await keyed.service.create(
        ADMIN,
        curatedBody({ auth: { kind: AuthKind.API_KEY, headerName: 'X-API-Key' } }),
      );

      const downView = await down.service.checkHealth(ADMIN, 'vendor-docs');
      const keyedView = await keyed.service.checkHealth(ADMIN, 'vendor-docs');

      expect(downView.health).toMatchObject({ status: CatalogHealthStatus.DOWN });
      expect(keyedView.health).toMatchObject({
        status: CatalogHealthStatus.UNKNOWN,
        errorCode: 'AUTH_REQUIRED',
      });
    });

    it('a deny rule added later turns the next health check into DOWN without a connection', async () => {
      const harness = buildHarness();
      await harness.service.create(ADMIN, curatedBody());
      harness.rulesRepository.findAll.mockResolvedValue([DENY_VENDOR]);

      const view = await harness.service.checkHealth(ADMIN, 'vendor-docs');

      expect(view.health).toMatchObject({
        status: CatalogHealthStatus.DOWN,
        errorCode: CurationErrorCode.HOST_DENIED,
      });
      expect(harness.transport.seen).toHaveLength(0);
    });
  });
});
