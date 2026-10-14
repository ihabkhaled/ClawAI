import { Module } from '@nestjs/common';

import { ConsentRequestsModule } from '../consent-requests/consent-requests.module';
import { EgressModule } from '../egress/egress.module';
import { InstallsModule } from '../installs/installs.module';
import { McpServersModule } from '../mcp-servers/mcp-servers.module';
import { OwnServersChatModule } from '../own-servers-chat/own-servers-chat.module';
import { RuntimeSettingsModule } from '../runtime-settings/runtime-settings.module';
import { DatetimeMathAdapter } from './adapters/datetime-math.adapter';
import { WeatherAdapter } from './adapters/weather.adapter';
import { WebFetchAdapter } from './adapters/web-fetch.adapter';
import { PluginInternalController } from './controllers/plugin-internal.controller';
import { PluginInvokeController } from './controllers/plugin-invoke.controller';
import { AdapterRegistryManager } from './managers/adapter-registry.manager';
import { BuiltinExecutorManager } from './managers/builtin-executor.manager';
import { CallLimiterManager } from './managers/call-limiter.manager';
import { ConsentGateManager } from './managers/consent-gate.manager';
import { InvocationAuditManager } from './managers/invocation-audit.manager';
import { InvokeTargetManager } from './managers/invoke-target.manager';
import { McpExecutorManager } from './managers/mcp-executor.manager';
import { PluginCallsQuotaManager } from './managers/plugin-calls-quota.manager';
import { RuntimePlanGateManager } from './managers/runtime-plan-gate.manager';
import { ToolArgumentsManager } from './managers/tool-arguments.manager';
import { InvocationAuditRepository } from './repositories/invocation-audit.repository';
import { InvokeTargetsRepository } from './repositories/invoke-targets.repository';
import { PluginInvokeService } from './services/plugin-invoke.service';
import { PluginResolveService } from './services/plugin-resolve.service';

@Module({
  imports: [
    ConsentRequestsModule,
    EgressModule,
    InstallsModule,
    McpServersModule,
    OwnServersChatModule,
    RuntimeSettingsModule,
  ],
  controllers: [PluginInvokeController, PluginInternalController],
  providers: [
    PluginInvokeService,
    PluginResolveService,
    InvokeTargetManager,
    RuntimePlanGateManager,
    ToolArgumentsManager,
    ConsentGateManager,
    CallLimiterManager,
    PluginCallsQuotaManager,
    BuiltinExecutorManager,
    McpExecutorManager,
    AdapterRegistryManager,
    InvocationAuditManager,
    WebFetchAdapter,
    WeatherAdapter,
    DatetimeMathAdapter,
    InvokeTargetsRepository,
    InvocationAuditRepository,
  ],
})
export class RuntimeModule {}
