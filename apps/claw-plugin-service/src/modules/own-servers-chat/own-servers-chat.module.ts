import { Module } from '@nestjs/common';

import { InstallsModule } from '../installs/installs.module';
import { McpServersModule } from '../mcp-servers/mcp-servers.module';
import { RuntimeSettingsModule } from '../runtime-settings/runtime-settings.module';
import { PluginMentionsController } from './controllers/plugin-mentions.controller';
import { OwnServerMentionsManager } from './managers/own-server-mentions.manager';
import { OwnServerOffersManager } from './managers/own-server-offers.manager';

/** The user's own MCP servers inside chat: `@` picker rows and the tools `resolve` offers. */
@Module({
  imports: [InstallsModule, McpServersModule, RuntimeSettingsModule],
  controllers: [PluginMentionsController],
  providers: [OwnServerOffersManager, OwnServerMentionsManager],
  exports: [OwnServerOffersManager],
})
export class OwnServersChatModule {}
