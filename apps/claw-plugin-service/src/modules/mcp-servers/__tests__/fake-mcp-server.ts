import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import { EgressError } from '../../egress/errors/egress.error';
import { SafeEgressManager } from '../../egress/managers/safe-egress.manager';
import { EgressTransport } from '../../egress/transports/egress.transport';
import { type EgressSendInput, type EgressSendResult } from '../../egress/types/egress.types';
import { publicResolver } from '../../egress/__tests__/egress-test-doubles';
import { McpClientManager } from '../managers/mcp-client.manager';

export type FakeToolListing = Record<string, unknown>;

export type FakeMcpOptions = {
  tools?: FakeToolListing[];
  /** Pages of tools; each answer carries nextCursor until the last page. */
  pages?: FakeToolListing[][];
  /** 'sse' answers every request as a text/event-stream. */
  stream?: boolean;
  protocolVersion?: string;
  sessionId?: string;
  callResult?: (name: string, args: unknown) => unknown;
  /** A method answered with this HTTP status and no JSON-RPC body. */
  httpFailure?: Record<string, number>;
  /** A method that never answers in time. */
  hangOn?: string;
  /** A tools/call answer cut off at the response size cap. */
  oversizeCall?: boolean;
  /** A JSON-RPC error answered to this method. */
  rpcError?: Record<string, { code: number; message: string }>;
};

export type SeenRequest = {
  method: string;
  headers: Record<string, string>;
  params: unknown;
  address: string;
  host: string;
};

/**
 * A scripted MCP server on the far side of the egress transport. It speaks just enough of the
 * streamable HTTP protocol (initialize, initialized, tools/list, tools/call) and has hostile
 * modes: poisoned descriptions (the caller passes them as tools), oversized answers, silence,
 * HTTP failures, JSON-RPC errors and a protocol version nobody supports.
 */
export class FakeMcpTransport extends EgressTransport {
  readonly seen: SeenRequest[] = [];

  constructor(public options: FakeMcpOptions = {}) {
    super();
  }

  send(input: EgressSendInput): Promise<EgressSendResult> {
    const message = JSON.parse(input.body ?? '{}') as {
      id?: number;
      method: string;
      params?: Record<string, unknown>;
    };
    this.seen.push({
      method: message.method,
      headers: input.headers,
      params: message.params,
      address: input.address,
      host: input.host,
    });
    const options = this.options;
    if (options.hangOn === message.method) {
      return Promise.reject(new EgressError(EgressErrorCode.TIMEOUT, 'fake silence'));
    }
    const status = new Map(Object.entries(options.httpFailure ?? {})).get(message.method);
    if (status !== undefined) return Promise.resolve(this.reply(status, '', 'text/plain'));
    return message.id === undefined
      ? Promise.resolve(this.reply(202, '', 'text/plain'))
      : Promise.resolve(this.answer(message.id, message.method, message.params));
  }

  private answer(
    id: number,
    method: string,
    params: Record<string, unknown> | undefined,
  ): EgressSendResult {
    const error = new Map(Object.entries(this.options.rpcError ?? {})).get(method);
    if (error !== undefined) return this.json({ jsonrpc: '2.0', id, error });
    if (method === 'initialize') {
      return this.json(
        {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: this.options.protocolVersion ?? '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'Fake MCP', version: '1.2.3' },
          },
        },
        this.options.sessionId === undefined ? {} : { 'mcp-session-id': this.options.sessionId },
      );
    }
    if (method === 'tools/list')
      return this.json({ jsonrpc: '2.0', id, result: this.listing(params) });
    if (method === 'tools/call') {
      if (this.options.oversizeCall === true) {
        return {
          ...this.reply(
            200,
            '{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"te',
            'application/json',
          ),
          truncated: true,
        };
      }
      const name = String(params?.['name']);
      const result = this.options.callResult?.(name, params?.['arguments']) ?? {
        content: [{ type: 'text', text: `ran ${name}` }],
      };
      return this.json({ jsonrpc: '2.0', id, result });
    }
    return this.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'no such method' } });
  }

  private listing(params: Record<string, unknown> | undefined): Record<string, unknown> {
    const pages = this.options.pages;
    if (pages === undefined) return { tools: this.options.tools ?? [] };
    const page = Number(params?.['cursor'] ?? 0);
    const next = page + 1 < pages.length ? String(page + 1) : undefined;
    return { tools: pages.at(page) ?? [], ...(next === undefined ? {} : { nextCursor: next }) };
  }

  private json(payload: unknown, extra: Record<string, string> = {}): EgressSendResult {
    return this.options.stream === true
      ? this.reply(
          200,
          `event: message\ndata: ${JSON.stringify(payload)}\n\n`,
          'text/event-stream',
          extra,
        )
      : this.reply(200, JSON.stringify(payload), 'application/json', extra);
  }

  private reply(
    status: number,
    body: string,
    contentType: string,
    extra: Record<string, string> = {},
  ): EgressSendResult {
    return { status, headers: { 'content-type': contentType, ...extra }, body, truncated: false };
  }
}

export function buildMcpClient(options: FakeMcpOptions = {}): {
  client: McpClientManager;
  transport: FakeMcpTransport;
} {
  const transport = new FakeMcpTransport(options);
  return {
    client: new McpClientManager(new SafeEgressManager(publicResolver(), transport)),
    transport,
  };
}

export const GOOD_TOOL: FakeToolListing = {
  name: 'create_issue',
  description: 'Create an issue in the tracker.',
  inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
};

export const ENDPOINT = {
  url: 'https://mcp.example.com/mcp',
  headers: { 'X-API-Key': 'sk-test-secret-0123456789' },
};
