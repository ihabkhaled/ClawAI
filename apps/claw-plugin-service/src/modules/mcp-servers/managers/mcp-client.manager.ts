import { Injectable } from '@nestjs/common';

import { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import { SafeEgressManager } from '../../egress/managers/safe-egress.manager';
import { type EgressResponse } from '../../egress/types/egress.types';
import {
  MCP_CLIENT_INFO,
  MCP_DISCOVERY_TIMEOUT_MS,
  MCP_ERROR_TEXT_MAX,
  MCP_HANDSHAKE_BYTES,
  MCP_HEADER_PROTOCOL,
  MCP_MAX_LIST_PAGES,
  MCP_NOTIFICATION_MAX_BYTES,
  MCP_RESPONSE_EXPANSION,
  MCP_RESPONSE_MAX_BYTES,
  MCP_RESPONSE_OVERHEAD_BYTES,
  MCP_SERVER_INFO_FIELD_MAX,
  MCP_SESSION_ID_PATTERN,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
  MCP_TOOLS_LIST_MAX_BYTES,
  MCP_USER_AGENT,
} from '../constants/mcp.constants';
import { McpFailure } from '../errors/mcp-failure.error';
import {
  initializeResultSchema,
  textBlockSchema,
  toolCallResultSchema,
  toolsListResultSchema,
} from '../schemas/json-rpc.schema';
import {
  type Exchange,
  type JsonRpcResponse,
  type McpCallParams,
  type McpCallResult,
  type McpDiscovery,
  type McpEndpoint,
  type McpServerInfo,
  type McpSession,
} from '../types/mcp-client.types';
import { createDeadline } from '../utilities/create-deadline.utility';
import { extractJsonRpcResponse } from '../utilities/extract-json-rpc-response.utility';
import { mcpFailureFromEgress } from '../utilities/mcp-failure-from-egress.utility';
import { stripHostileText } from '../utilities/strip-hostile-text.utility';

/**
 * A small MCP client over the streamable HTTP transport: initialize, notifications/initialized,
 * then tools/list or tools/call. Every byte goes through SafeEgressManager (public hosts only,
 * pinned address, no redirects, size and time caps). A session lives for one call or one
 * discovery; nothing is cached between them. Whatever the server returns is untrusted data.
 */
@Injectable()
export class McpClientManager {
  constructor(private readonly egress: SafeEgressManager) {}

  async discover(endpoint: McpEndpoint, signal?: AbortSignal): Promise<McpDiscovery> {
    const exchange = this.start(endpoint, MCP_DISCOVERY_TIMEOUT_MS, signal);
    const session = await this.open(exchange);
    const rawTools: unknown[] = [];
    let cursor: string | undefined;
    let moreAvailable = false;
    for (let page = 0; page < MCP_MAX_LIST_PAGES; page += 1) {
      const params = cursor === undefined ? {} : { cursor };
      const result = await this.request(exchange, 'tools/list', params, MCP_TOOLS_LIST_MAX_BYTES);
      const parsed = toolsListResultSchema.safeParse(result);
      if (!parsed.success) throw new McpFailure(McpFailureKind.REJECTED, 'bad tools/list result');
      rawTools.push(...parsed.data.tools);
      cursor = parsed.data.nextCursor;
      moreAvailable = cursor !== undefined;
      if (cursor === undefined) break;
    }
    return {
      protocolVersion: session.protocolVersion,
      serverInfo: session.serverInfo,
      rawTools,
      moreAvailable,
    };
  }

  async callTool(endpoint: McpEndpoint, params: McpCallParams): Promise<McpCallResult> {
    const exchange = this.start(endpoint, params.timeoutMs, params.signal);
    await this.open(exchange);
    const wireBudget = Math.min(
      params.maxResultBytes * MCP_RESPONSE_EXPANSION + MCP_RESPONSE_OVERHEAD_BYTES,
      MCP_RESPONSE_MAX_BYTES,
    );
    const outcome = await this.requestOrError(
      exchange,
      'tools/call',
      { name: params.remoteName, arguments: params.args },
      wireBudget,
    );
    return typeof outcome === 'string'
      ? { text: outcome, isError: true, droppedBlocks: 0 }
      : this.toCallResult(outcome);
  }

  private start(endpoint: McpEndpoint, totalMs: number, signal?: AbortSignal): Exchange {
    return { endpoint, deadline: createDeadline(totalMs), signal, session: null, nextId: 1 };
  }

  /** initialize, check the version, then tell the server we are ready. */
  private async open(exchange: Exchange): Promise<McpSession> {
    const result = await this.request(
      exchange,
      'initialize',
      {
        protocolVersion: MCP_SUPPORTED_PROTOCOL_VERSIONS[0],
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO,
      },
      MCP_HANDSHAKE_BYTES,
    );
    const parsed = initializeResultSchema.safeParse(result);
    if (!parsed.success) throw new McpFailure(McpFailureKind.REJECTED, 'bad initialize result');
    if (!MCP_SUPPORTED_PROTOCOL_VERSIONS.includes(parsed.data.protocolVersion)) {
      throw new McpFailure(McpFailureKind.REJECTED, 'unsupported protocol version');
    }
    const session: McpSession = {
      protocolVersion: parsed.data.protocolVersion,
      sessionId: exchange.sessionHeader ?? null,
      serverInfo: this.cleanServerInfo(parsed.data.serverInfo),
    };
    exchange.session = session;
    await this.post(
      exchange,
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      MCP_NOTIFICATION_MAX_BYTES,
    );
    return session;
  }

  /** A JSON-RPC request whose error object is a protocol failure. */
  private async request(
    exchange: Exchange,
    method: string,
    params: unknown,
    maxBytes: number,
  ): Promise<unknown> {
    const response = await this.exchange(exchange, method, params, maxBytes);
    if (response.error !== undefined) {
      throw new McpFailure(McpFailureKind.REJECTED, `rpc error ${String(response.error.code)}`);
    }
    return response.result;
  }

  /** Like request, but a JSON-RPC error comes back as text for the model instead of failing the call. */
  private async requestOrError(
    exchange: Exchange,
    method: string,
    params: unknown,
    maxBytes: number,
  ): Promise<unknown> {
    const response = await this.exchange(exchange, method, params, maxBytes);
    return response.error === undefined
      ? response.result
      : stripHostileText(response.error.message, true).slice(0, MCP_ERROR_TEXT_MAX);
  }

  private async exchange(
    exchange: Exchange,
    method: string,
    params: unknown,
    maxBytes: number,
  ): Promise<JsonRpcResponse> {
    const id = exchange.nextId;
    exchange.nextId += 1;
    const response = await this.post(
      exchange,
      { jsonrpc: '2.0', id, method, params },
      maxBytes,
      id,
    );
    const contentType = response.headers['content-type'] ?? '';
    const found = extractJsonRpcResponse(contentType, response.body, id);
    if (found === null) {
      const kind = response.truncated ? McpFailureKind.OVERSIZED : McpFailureKind.REJECTED;
      throw new McpFailure(kind, 'no response for the request');
    }
    this.rememberSession(exchange, response.headers['mcp-session-id']);
    return found;
  }

  private async post(
    exchange: Exchange,
    message: Record<string, unknown>,
    maxBytes: number,
    waitForId?: number,
  ): Promise<EgressResponse> {
    try {
      const response = await this.egress.request({
        url: exchange.endpoint.url,
        method: 'POST',
        headers: this.headersFor(exchange),
        body: JSON.stringify(message),
        timeoutMs: exchange.deadline.remaining(),
        maxResponseBytes: maxBytes,
        signal: exchange.signal,
        stopWhen:
          waitForId === undefined
            ? undefined
            : (text): boolean =>
                extractJsonRpcResponse('text/event-stream', text, waitForId) !== null,
      });
      if (response.status < 200 || response.status >= 300) {
        throw new McpFailure(McpFailureKind.REJECTED, `http ${String(response.status)}`);
      }
      return response;
    } catch (error) {
      throw mcpFailureFromEgress(error);
    }
  }

  private headersFor(exchange: Exchange): Record<string, string> {
    const session = exchange.session;
    const sessionId = session?.sessionId ?? null;
    return {
      ...exchange.endpoint.headers,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'User-Agent': MCP_USER_AGENT,
      ...(session === null ? {} : { [MCP_HEADER_PROTOCOL]: session.protocolVersion }),
      ...(sessionId === null ? {} : { 'Mcp-Session-Id': sessionId }),
    };
  }

  private rememberSession(exchange: Exchange, header: string | undefined): void {
    if (exchange.sessionHeader !== undefined || header === undefined) return;
    if (MCP_SESSION_ID_PATTERN.test(header)) exchange.sessionHeader = header;
  }

  private cleanServerInfo(
    info: { name: string; version?: string } | undefined,
  ): McpServerInfo | null {
    if (info === undefined) return null;
    const clean = (value: string): string =>
      stripHostileText(value, false).trim().slice(0, MCP_SERVER_INFO_FIELD_MAX);
    return { name: clean(info.name), version: clean(info.version ?? '') };
  }

  private toCallResult(raw: unknown): McpCallResult {
    const parsed = toolCallResultSchema.safeParse(raw);
    if (!parsed.success) throw new McpFailure(McpFailureKind.REJECTED, 'bad tools/call result');
    const texts: string[] = [];
    let dropped = 0;
    for (const block of parsed.data.content ?? []) {
      const text = textBlockSchema.safeParse(block);
      if (text.success) texts.push(text.data.text);
      else dropped += 1;
    }
    if (texts.length === 0 && parsed.data.structuredContent !== undefined) {
      texts.push(JSON.stringify(parsed.data.structuredContent));
    }
    return {
      text: texts.join('\n'),
      isError: parsed.data.isError === true,
      droppedBlocks: dropped,
    };
  }
}
