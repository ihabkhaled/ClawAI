import { Module } from '@nestjs/common';

import { EgressModule } from '../egress/egress.module';
import { HostRulesModule } from '../host-rules/host-rules.module';
import { InstallsModule } from '../installs/installs.module';
import { RuntimeSettingsModule } from '../runtime-settings/runtime-settings.module';
import { PluginServersController } from './controllers/plugin-servers.controller';
import { McpClientManager } from './managers/mcp-client.manager';
import { McpEndpointManager } from './managers/mcp-endpoint.manager';
import { McpServerHealthManager } from './managers/mcp-server-health.manager';
import { McpServerPlanGateManager } from './managers/mcp-server-plan-gate.manager';
import { McpServerPresenterManager } from './managers/mcp-server-presenter.manager';
import { McpServerToolPolicyManager } from './managers/mcp-server-tool-policy.manager';
import { McpToolSnapshotManager } from './managers/mcp-tool-snapshot.manager';
import { McpServerSecretsRepository } from './repositories/mcp-server-secrets.repository';
import { McpServersRepository } from './repositories/mcp-servers.repository';
import { McpServerReviewService } from './services/mcp-server-review.service';
import { McpServersService } from './services/mcp-servers.service';

@Module({
  imports: [EgressModule, HostRulesModule, InstallsModule, RuntimeSettingsModule],
  controllers: [PluginServersController],
  providers: [
    McpServersService,
    McpServerReviewService,
    McpClientManager,
    McpEndpointManager,
    McpServerHealthManager,
    McpServerPlanGateManager,
    McpServerPresenterManager,
    McpServerToolPolicyManager,
    McpToolSnapshotManager,
    McpServersRepository,
    McpServerSecretsRepository,
  ],
  exports: [
    McpClientManager,
    McpEndpointManager,
    McpServerHealthManager,
    McpServersRepository,
    McpServerPresenterManager,
  ],
})
export class McpServersModule {}
