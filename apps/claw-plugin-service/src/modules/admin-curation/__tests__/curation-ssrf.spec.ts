import { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { McpTransport } from '../../../common/enums/mcp-transport.enum';
import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { ScriptedResolver } from '../../egress/__tests__/egress-test-doubles';
import { buildHarness, curatedBody, errorCodeOf, SEARCH_TOOL } from './curation-fixtures';

const BLOCKED_URLS = [
  'http://mcp.vendor.example.com/mcp',
  'ftp://mcp.vendor.example.com/mcp',
  'https://localhost/mcp',
  'https://127.0.0.1/mcp',
  'https://169.254.169.254/latest/meta-data',
  'https://[::1]/mcp',
  'https://[::ffff:10.0.0.5]/mcp',
  'https://10.0.0.5/mcp',
  'https://2130706433/mcp',
  'https://0x7f.0.0.1/mcp',
  'https://service.internal/mcp',
  'https://printer.local/mcp',
  'https://metadata.google.internal/computeMetadata/v1',
  'https://user:pw@mcp.vendor.example.com/mcp',
  'https://mcp.vendor.example.com:6379/mcp',
  'https://mcp.vendor.example.com/mcp\r\nHost: evil.example.com',
  'not a url',
];

describe('admin catalog curation: SSRF guard', () => {
  it.each(BLOCKED_URLS)('refuses %j when saving an entry (422 URL_BLOCKED)', async (url) => {
    const harness = buildHarness();
    const body = curatedBody({ server: { url, transport: McpTransport.STREAMABLE_HTTP } });

    expect(await errorCodeOf(harness.service.create('admin-1', body))).toBe(
      CurationErrorCode.URL_BLOCKED,
    );
    expect(harness.transport.seen).toHaveLength(0);
    expect(harness.repository.records.size).toBe(0);
  });

  it.each(BLOCKED_URLS)('refuses %j in the tool preview before any connection', async (url) => {
    const harness = buildHarness();

    const code = await errorCodeOf(
      harness.service.preview({
        url,
        transport: McpTransport.STREAMABLE_HTTP,
        auth: { kind: AuthKind.NONE },
      }),
    );

    expect(code).toBe(CurationErrorCode.URL_BLOCKED);
    expect(harness.transport.seen).toHaveLength(0);
  });

  it('refuses a public-looking name that resolves to a private address, sending nothing', async () => {
    const resolver = new ScriptedResolver(() => ['10.0.0.5']);
    const harness = buildHarness({ tools: [SEARCH_TOOL] }, [], resolver);

    const failure = await harness.probe
      .run({
        url: 'https://rebind.vendor.example.com/mcp',
        transport: McpTransport.STREAMABLE_HTTP,
        authKind: AuthKind.NONE,
      })
      .then(
        () => null,
        (error: unknown) => error as { kind?: string },
      );

    expect(failure?.kind).toBe(McpFailureKind.UNREACHABLE);
    expect(harness.transport.seen).toHaveLength(0);
  });

  it('a name that resolves to one public and one private address is refused as a whole', async () => {
    const resolver = new ScriptedResolver(() => ['93.184.216.34', '169.254.169.254']);
    const harness = buildHarness({ tools: [SEARCH_TOOL] }, [], resolver);

    const code = await errorCodeOf(
      harness.service.preview({
        url: 'https://mixed.vendor.example.com/mcp',
        transport: McpTransport.STREAMABLE_HTTP,
        auth: { kind: AuthKind.NONE },
      }),
    );

    expect(code).toBe(CurationErrorCode.PROBE_FAILED);
    expect(harness.transport.seen).toHaveLength(0);
  });

  it('a credential header that could shadow a framing header is refused (422)', async () => {
    const harness = buildHarness();

    const code = await errorCodeOf(
      harness.service.preview({
        url: 'https://mcp.vendor.example.com/mcp',
        transport: McpTransport.STREAMABLE_HTTP,
        auth: { kind: AuthKind.API_KEY, headerName: 'Content-Type' },
        credential: 'sk-test-secret-0123456789',
      }),
    );

    expect(code).toBe(CurationErrorCode.MANIFEST_INVALID);
    expect(harness.transport.seen).toHaveLength(0);
  });
});
