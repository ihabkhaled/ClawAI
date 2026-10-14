import { McpFailureKind } from '../../../../common/enums/mcp-failure-kind.enum';
import { McpFailure } from '../../errors/mcp-failure.error';
import { buildMcpClient, ENDPOINT, GOOD_TOOL } from '../../__tests__/fake-mcp-server';

const ZWSP = String.fromCodePoint(0x200b);
const CALL = {
  remoteName: 'create_issue',
  args: { title: 'x' },
  timeoutMs: 5000,
  maxResultBytes: 4096,
};

async function failureOf(promise: Promise<unknown>): Promise<McpFailure> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof McpFailure) return error;
    throw error;
  }
  throw new Error('expected a McpFailure');
}

describe('McpClientManager.discover', () => {
  it('runs initialize, initialized and tools/list in order and returns the raw tools', async () => {
    const { client, transport } = buildMcpClient({ tools: [GOOD_TOOL] });

    const discovery = await client.discover(ENDPOINT);

    expect(transport.seen.map((request) => request.method)).toEqual([
      'initialize',
      'notifications/initialized',
      'tools/list',
    ]);
    expect(discovery.rawTools).toEqual([GOOD_TOOL]);
    expect(discovery.protocolVersion).toBe('2025-06-18');
    expect(discovery.serverInfo).toEqual({ name: 'Fake MCP', version: '1.2.3' });
  });

  it('attaches the credential header to every request and nothing else from the caller', async () => {
    const { client, transport } = buildMcpClient({ tools: [GOOD_TOOL] });

    await client.discover(ENDPOINT);

    for (const request of transport.seen) {
      expect(request.headers['X-API-Key']).toBe('sk-test-secret-0123456789');
      expect(request.headers['Content-Type']).toBe('application/json');
      expect(request.headers['Accept']).toContain('text/event-stream');
    }
  });

  it('keeps the session id and the protocol version after initialize', async () => {
    const { client, transport } = buildMcpClient({ tools: [GOOD_TOOL], sessionId: 'sess-abc123' });

    await client.discover(ENDPOINT);

    const [initialize, initialized, list] = transport.seen;
    expect(initialize?.headers['MCP-Protocol-Version']).toBeUndefined();
    expect(initialized?.headers['Mcp-Session-Id']).toBe('sess-abc123');
    expect(list?.headers['Mcp-Session-Id']).toBe('sess-abc123');
    expect(list?.headers['MCP-Protocol-Version']).toBe('2025-06-18');
  });

  it('ignores a session id that is not plain printable ASCII', async () => {
    const { client, transport } = buildMcpClient({ tools: [GOOD_TOOL], sessionId: 'bad ide' });

    await client.discover(ENDPOINT);

    expect(transport.seen[2]?.headers['Mcp-Session-Id']).toBeUndefined();
  });

  it('reads a text/event-stream answer', async () => {
    const { client } = buildMcpClient({ tools: [GOOD_TOOL], stream: true });

    const discovery = await client.discover(ENDPOINT);

    expect(discovery.rawTools).toHaveLength(1);
  });

  it('follows nextCursor across pages and stops at the page limit', async () => {
    const page = (name: string) => [{ ...GOOD_TOOL, name }];
    const { client } = buildMcpClient({
      pages: [page('a'), page('b'), page('c'), page('d'), page('e')],
    });

    const discovery = await client.discover(ENDPOINT);

    expect(discovery.rawTools).toHaveLength(4);
    expect(discovery.moreAvailable).toBe(true);
  });

  it('refuses a server that answers with a protocol version nobody speaks', async () => {
    const { client } = buildMcpClient({ protocolVersion: '1999-01-01' });

    expect((await failureOf(client.discover(ENDPOINT))).kind).toBe(McpFailureKind.REJECTED);
  });

  it('turns an HTTP failure into REJECTED without echoing the status to the caller', async () => {
    const { client } = buildMcpClient({ httpFailure: { initialize: 401 } });

    const failure = await failureOf(client.discover(ENDPOINT));

    expect(failure.kind).toBe(McpFailureKind.REJECTED);
  });

  it('turns a JSON-RPC error into REJECTED', async () => {
    const { client } = buildMcpClient({
      rpcError: { 'tools/list': { code: -32603, message: 'boom' } },
    });

    expect((await failureOf(client.discover(ENDPOINT))).kind).toBe(McpFailureKind.REJECTED);
  });

  it('turns silence into TIMEOUT', async () => {
    const { client } = buildMcpClient({ hangOn: 'tools/list' });

    expect((await failureOf(client.discover(ENDPOINT))).kind).toBe(McpFailureKind.TIMEOUT);
  });

  it('refuses a private URL before sending anything', async () => {
    const { client, transport } = buildMcpClient({ tools: [GOOD_TOOL] });

    const failure = await failureOf(
      client.discover({ url: 'https://127.0.0.1/mcp', headers: ENDPOINT.headers }),
    );

    expect(failure.kind).toBe(McpFailureKind.UNREACHABLE);
    expect(transport.seen).toHaveLength(0);
  });

  it('strips invisible characters from the server name it reports', async () => {
    const { client, transport } = buildMcpClient({ tools: [GOOD_TOOL] });
    const send = transport.send.bind(transport);
    transport.send = async (input) => {
      const result = await send(input);
      return { ...result, body: result.body.replace('Fake MCP', `Fa${ZWSP}ke MCP`) };
    };

    const discovery = await client.discover(ENDPOINT);

    expect(discovery.serverInfo?.name).toBe('Fake MCP');
  });
});

describe('McpClientManager.callTool', () => {
  it('handshakes, calls the tool by its remote name and returns the text', async () => {
    const { client, transport } = buildMcpClient();

    const result = await client.callTool(ENDPOINT, CALL);

    expect(result).toEqual({ text: 'ran create_issue', isError: false, droppedBlocks: 0 });
    const call = transport.seen.at(-1);
    expect(call?.method).toBe('tools/call');
    expect(call?.params).toEqual({ name: 'create_issue', arguments: { title: 'x' } });
  });

  it('joins several text blocks and counts the blocks it dropped', async () => {
    const { client } = buildMcpClient({
      callResult: () => ({
        content: [
          { type: 'text', text: 'one' },
          { type: 'image', data: 'AAAA', mimeType: 'image/png' },
          { type: 'resource', resource: { uri: 'file:///etc/passwd' } },
          { type: 'text', text: 'two' },
        ],
      }),
    });

    const result = await client.callTool(ENDPOINT, CALL);

    expect(result.text).toBe('one\ntwo');
    expect(result.droppedBlocks).toBe(2);
  });

  it('reads structured content when there is no text', async () => {
    const { client } = buildMcpClient({ callResult: () => ({ structuredContent: { ok: true } }) });

    expect((await client.callTool(ENDPOINT, CALL)).text).toBe('{"ok":true}');
  });

  it('reports a tool-level error as isError, not as a failure', async () => {
    const { client } = buildMcpClient({
      callResult: () => ({ isError: true, content: [{ type: 'text', text: 'not found' }] }),
    });

    expect(await client.callTool(ENDPOINT, CALL)).toEqual({
      text: 'not found',
      isError: true,
      droppedBlocks: 0,
    });
  });

  it('hands a JSON-RPC error on the call back as error text, capped and cleaned', async () => {
    const message = `bad${ZWSP} ${'x'.repeat(3000)}`;
    const { client } = buildMcpClient({ rpcError: { 'tools/call': { code: -32602, message } } });

    const result = await client.callTool(ENDPOINT, CALL);

    expect(result.isError).toBe(true);
    expect(result.text.startsWith('bad xxx')).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(1000);
  });

  it('reads the answer from an event stream', async () => {
    const { client } = buildMcpClient({ stream: true });

    expect((await client.callTool(ENDPOINT, CALL)).text).toBe('ran create_issue');
  });

  it('reports an answer cut off at the size cap as OVERSIZED', async () => {
    const { client } = buildMcpClient({ oversizeCall: true });

    expect((await failureOf(client.callTool(ENDPOINT, CALL))).kind).toBe(McpFailureKind.OVERSIZED);
  });

  it('times out when the server goes silent on the call', async () => {
    const { client } = buildMcpClient({ hangOn: 'tools/call' });

    expect((await failureOf(client.callTool(ENDPOINT, CALL))).kind).toBe(McpFailureKind.TIMEOUT);
  });

  it('refuses a result that is not the shape of a tool result', async () => {
    const { client } = buildMcpClient({ callResult: () => ({ content: 'a string' }) });

    expect((await failureOf(client.callTool(ENDPOINT, CALL))).kind).toBe(McpFailureKind.REJECTED);
  });

  it('stops at the shared deadline when the budget is already spent', async () => {
    const { client, transport } = buildMcpClient();

    const failure = await failureOf(client.callTool(ENDPOINT, { ...CALL, timeoutMs: 0 }));

    expect(failure.kind).toBe(McpFailureKind.TIMEOUT);
    expect(transport.seen).toHaveLength(0);
  });
});
