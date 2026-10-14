import { Injectable, Logger } from '@nestjs/common';
import { type PluginMentionView } from '@claw/shared-types';

import { ServerState } from '../../../common/enums/server-status.enum';
import { SERVERS_LIST_MAX } from '../../mcp-servers/constants/mcp.constants';
import { McpServersRepository } from '../../mcp-servers/repositories/mcp-servers.repository';
import { RuntimeSettingsManager } from '../../runtime-settings/managers/runtime-settings.manager';
import {
  OWN_SERVER_ICON_KEY,
  OWN_SERVER_PICKER_NAME_MAX,
} from '../constants/own-servers-chat.constants';
import { cleanModelText } from '../utilities/clean-model-text.utility';
import { isBreakerOpen } from '../utilities/is-breaker-open.utility';

/**
 * The caller's own MCP servers as `@` picker rows. A server that is switched off, waiting for
 * review or rejected is listed as not enabled (the picker leaves it out); one whose breaker is open
 * reads the same. A failure to read the list returns an empty list: the picker still works for the
 * installed plugins.
 */
@Injectable()
export class OwnServerMentionsManager {
  private readonly logger = new Logger(OwnServerMentionsManager.name);

  constructor(
    private readonly servers: McpServersRepository,
    private readonly settings: RuntimeSettingsManager,
  ) {}

  async mentions(userId: string, now: number = Date.now()): Promise<PluginMentionView[]> {
    try {
      if (!(await this.settings.load()).userServersEnabled) return [];
      const rows = await this.servers.findAllOwned(userId, SERVERS_LIST_MAX);
      return rows
        .filter((row) => row.ownerUserId === userId)
        .map((row) => ({
          installId: row.id,
          slug: row.slug,
          name: cleanModelText(row.name, OWN_SERVER_PICKER_NAME_MAX),
          iconKey: OWN_SERVER_ICON_KEY,
          enabled: row.status === ServerState.APPROVED && !isBreakerOpen(row, now),
        }));
    } catch (error: unknown) {
      const name = error instanceof Error ? error.name : 'unknown';
      this.logger.warn(`mentions: own servers unavailable: ${name}`);
      return [];
    }
  }
}
