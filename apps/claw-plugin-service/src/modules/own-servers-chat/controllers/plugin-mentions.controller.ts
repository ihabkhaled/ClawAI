import { Controller, Get, Header, Headers } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission, type PluginMentionView } from '@claw/shared-types';

import { PluginInstallsService } from '../../installs/services/plugin-installs.service';
import { OWN_SERVER_MENTIONS_CACHE_CONTROL } from '../constants/own-servers-chat.constants';
import { OwnServerMentionsManager } from '../managers/own-server-mentions.manager';

/**
 * GET /plugins/mentions: everything the composer `@` picker can offer, the installed catalog
 * plugins first and then the caller's own MCP servers. Both lists are the caller's alone.
 */
@Controller('plugins/mentions')
export class PluginMentionsController {
  constructor(
    private readonly installs: PluginInstallsService,
    private readonly ownServers: OwnServerMentionsManager,
  ) {}

  @Get()
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', OWN_SERVER_MENTIONS_CACHE_CONTROL)
  async mentions(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<PluginMentionView[]> {
    const [installed, own] = await Promise.all([
      this.installs.mentions(user.id, acceptLanguage),
      this.ownServers.mentions(user.id),
    ]);
    return [...installed, ...own];
  }
}
