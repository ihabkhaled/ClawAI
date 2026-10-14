import { Injectable, Logger } from '@nestjs/common';

import { ServerState } from '../../../common/enums/server-status.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { NATIVE_TOOL_PREFIX } from '../../catalog/constants/catalog.constants';
import { McpServersRepository } from '../../mcp-servers/repositories/mcp-servers.repository';
import { type ServerRecord } from '../../mcp-servers/types/mcp-server.types';
import { RuntimeSettingsManager } from '../../runtime-settings/managers/runtime-settings.manager';
import { type ResolvedTool, type ResolveNotice } from '../../runtime/types/resolve.types';
import {
  OWN_SERVER_CACHE_MAX_ENTRIES,
  OWN_SERVER_CACHE_TTL_MS,
  OWN_SERVER_DESCRIPTION_MAX,
  OWN_SERVER_LOCAL_NAME_PATTERN,
  OWN_SERVER_NAME_IN_BLOCK_MAX,
  OWN_SERVER_NATIVE_NAME_MAX,
  OWN_SERVER_RESOLVE_DEADLINE_MS,
  OWN_SERVER_TOOLS_MAX,
  RESOLVE_NOTICE_SERVER_NEEDS_REVIEW,
  RESOLVE_NOTICE_SERVER_UNAVAILABLE,
} from '../constants/own-servers-chat.constants';
import { type OwnServerMention, type OwnServerOffer } from '../types/own-server-offer.types';
import { cleanModelText } from '../utilities/clean-model-text.utility';
import { isBreakerOpen } from '../utilities/is-breaker-open.utility';
import { TtlCache } from '../utilities/ttl-cache.utility';

/**
 * Turns the own MCP servers a message mentioned into native tools for the model.
 *
 * The tool list is the owner-approved snapshot already stored with the server (names, schemas and
 * risks are pinned there; a changed list waits for review), so offering tools never contacts the
 * server: a slow or dead server cannot slow a chat turn here. The snapshot read is cached in memory
 * for a bounded time; a stale entry can offer a tool that was just switched off, but the call itself
 * re-reads the database and is refused. Anything that goes wrong becomes a notice, never an error.
 */
@Injectable()
export class OwnServerOffersManager {
  private readonly logger = new Logger(OwnServerOffersManager.name);
  private readonly cache = new TtlCache<ServerRecord>(
    OWN_SERVER_CACHE_TTL_MS,
    OWN_SERVER_CACHE_MAX_ENTRIES,
  );

  constructor(
    private readonly servers: McpServersRepository,
    private readonly settings: RuntimeSettingsManager,
  ) {}

  async offer(
    userId: string,
    mentions: readonly OwnServerMention[],
    now: number = Date.now(),
  ): Promise<OwnServerOffer> {
    if (mentions.length === 0) return { tools: [], lines: [], notices: [] };
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<'TIMEOUT'>((resolve) => {
      timer = setTimeout(() => resolve('TIMEOUT'), OWN_SERVER_RESOLVE_DEADLINE_MS);
    });
    try {
      const outcome = await Promise.race([this.build(userId, mentions, now), deadline]);
      if (outcome === 'TIMEOUT') {
        this.logger.warn('offer: own-server lookup passed its deadline, continuing without it');
        return this.unavailable();
      }
      return outcome;
    } catch (error: unknown) {
      this.logger.warn(`offer: own-server lookup failed: ${this.describe(error)}`);
      return this.unavailable();
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private async build(
    userId: string,
    mentions: readonly OwnServerMention[],
    now: number,
  ): Promise<OwnServerOffer> {
    const offer: OwnServerOffer = { tools: [], lines: [], notices: [] };
    if (!(await this.settings.load()).userServersEnabled) return offer;
    const ids = [...new Set(mentions.map((mention) => mention.serverId))];
    const records = await Promise.all(ids.map((id) => this.read(userId, id, now)));
    for (const record of records) {
      if (record !== null) this.add(offer, record, mentions, now);
    }
    return offer;
  }

  private async read(userId: string, serverId: string, now: number): Promise<ServerRecord | null> {
    const key = `${userId}:${serverId}`;
    const cached = this.cache.get(key, now);
    if (cached !== undefined) return cached;
    const record = await this.servers.findOwned(serverId, userId);
    if (record?.ownerUserId !== userId) return null;
    this.cache.set(key, record, now);
    return record;
  }

  private add(
    offer: OwnServerOffer,
    server: ServerRecord,
    mentions: readonly OwnServerMention[],
    now: number,
  ): void {
    if (server.status === ServerState.NEEDS_REVIEW) {
      offer.notices.push({ code: RESOLVE_NOTICE_SERVER_NEEDS_REVIEW, pluginSlug: server.slug });
      return;
    }
    if (server.status === ServerState.UNREACHABLE || isBreakerOpen(server, now)) {
      offer.notices.push({ code: RESOLVE_NOTICE_SERVER_UNAVAILABLE, pluginSlug: server.slug });
      return;
    }
    if (server.status !== ServerState.APPROVED) return;
    const mine = mentions.filter((mention) => mention.serverId === server.id);
    const whole = mine.some((mention) => mention.toolName === undefined);
    const picked = new Set(mine.map((mention) => mention.toolName));
    const budget = Math.max(OWN_SERVER_TOOLS_MAX - offer.tools.length, 0);
    const tools = server.tools
      .filter((tool) => whole || picked.has(tool.localName))
      .flatMap((tool) => this.toResolved(server, tool))
      .slice(0, budget);
    if (tools.length === 0) return;
    offer.tools.push(...tools);
    const name = cleanModelText(server.name, OWN_SERVER_NAME_IN_BLOCK_MAX);
    offer.lines.push(`- ${server.slug}: ${name} (your own MCP server)`);
  }

  private toResolved(server: ServerRecord, tool: ServerRecord['tools'][number]): ResolvedTool[] {
    const nativeName = `${NATIVE_TOOL_PREFIX}_${server.slug}_${tool.localName}`;
    if (
      !tool.enabled ||
      !OWN_SERVER_LOCAL_NAME_PATTERN.test(tool.localName) ||
      nativeName.length > OWN_SERVER_NATIVE_NAME_MAX ||
      !isPlainRecord(tool.inputSchema)
    ) {
      return [];
    }
    return [
      {
        nativeName,
        installId: server.id,
        pluginSlug: server.slug,
        toolName: tool.localName,
        title: tool.localName,
        description: cleanModelText(tool.description, OWN_SERVER_DESCRIPTION_MAX),
        inputSchema: tool.inputSchema,
        riskLevel: tool.riskLevel,
      },
    ];
  }

  private unavailable(): OwnServerOffer {
    const notices: ResolveNotice[] = [{ code: RESOLVE_NOTICE_SERVER_UNAVAILABLE }];
    return { tools: [], lines: [], notices };
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.name : 'unknown';
  }
}
