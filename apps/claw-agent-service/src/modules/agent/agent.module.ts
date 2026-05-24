import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AgentSessionController } from './controllers/agent-session.controller';
import { AgentCommandController } from './controllers/agent-command.controller';
import { AgentRepoController } from './controllers/agent-repo.controller';
import { AgentEventController } from './controllers/agent-event.controller';
import { AgentAuthController } from './controllers/agent-auth.controller';
import { AgentDeviceController } from './controllers/agent-device.controller';
import { AgentCommandStreamController } from './controllers/agent-command-stream.controller';
import { AgentScheduledCommandController } from './controllers/agent-scheduled-command.controller';
import { CapabilityController } from './controllers/capability.controller';
import { CapabilityCliController } from './controllers/capability-cli.controller';
import { CapabilityStreamController } from './controllers/capability-stream.controller';
import { AgentTerminalInternalController } from './controllers/agent-terminal-internal.controller';
import { AgentSessionService } from './services/agent-session.service';
import { AgentCommandService } from './services/agent-command.service';
import { AgentRepoService } from './services/agent-repo.service';
import { AgentEventService } from './services/agent-event.service';
import { PairingService } from './services/pairing.service';
import { DeviceCodeService } from './services/device-code.service';
import { RefreshService } from './services/refresh.service';
import { DeviceService } from './services/device.service';
import { TokenService } from './services/token.service';
import { RevocationCacheService } from './services/revocation-cache.service';
import { PolicyService } from './services/policy.service';
import { CommandRiskService } from './services/command-risk.service';
import { CapabilityDualWriteMetricsService } from './services/capability-dual-write-metrics.service';
import { CapabilityEventBusService } from './services/capability-event-bus.service';
import { CapabilityRiskService } from './services/capability-risk.service';
import { CapabilityService } from './services/capability.service';
import { CommandStreamService } from './services/command-stream.service';
import { ScheduledCommandService } from './services/scheduled-command.service';
import { AgentTerminalSeedService } from './services/agent-terminal-seed.service';
import { AgentSessionManager } from './managers/agent-session.manager';
import { AgentCommandManager } from './managers/agent-command.manager';
import { PairingCleanupManager } from './managers/pairing-cleanup.manager';
import { RefreshCleanupManager } from './managers/refresh-cleanup.manager';
import { SchedulerManager } from './managers/scheduler.manager';
import { CapabilityApprovalManager } from './managers/capability-approval.manager';
import { CapabilityExpirySweeperManager } from './managers/capability-expiry-sweeper.manager';
import { AgentSessionRepository } from './repositories/agent-session.repository';
import { AgentCommandRepository } from './repositories/agent-command.repository';
import { AgentRepoRepository } from './repositories/agent-repo.repository';
import { AgentEventRepository } from './repositories/agent-event.repository';
import { DeviceRepository } from './repositories/device.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { PairingRequestRepository } from './repositories/pairing-request.repository';
import { DeviceCodeRequestRepository } from './repositories/device-code-request.repository';
import { PolicyRepository } from './repositories/policy.repository';
import { ScheduledCommandRepository } from './repositories/scheduled-command.repository';
import { CapabilityInvocationRepository } from './repositories/capability-invocation.repository';
import { AgentKeyGuard } from '../../common/guards/agent-key.guard';
import { DeviceAccessGuard } from '../../common/guards/device-access.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { CompatAgentGuard } from '../../common/guards/compat-agent.guard';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [
    AgentSessionController,
    AgentCommandController,
    AgentRepoController,
    AgentEventController,
    AgentAuthController,
    AgentDeviceController,
    AgentCommandStreamController,
    AgentScheduledCommandController,
    CapabilityController,
    CapabilityCliController,
    CapabilityStreamController,
    AgentTerminalInternalController,
  ],
  providers: [
    AgentSessionService,
    AgentCommandService,
    AgentRepoService,
    AgentEventService,
    PairingService,
    DeviceCodeService,
    RefreshService,
    DeviceService,
    TokenService,
    RevocationCacheService,
    PolicyService,
    CommandRiskService,
    CapabilityDualWriteMetricsService,
    CapabilityEventBusService,
    CapabilityRiskService,
    CapabilityService,
    CommandStreamService,
    ScheduledCommandService,
    AgentTerminalSeedService,
    AgentSessionManager,
    AgentCommandManager,
    PairingCleanupManager,
    RefreshCleanupManager,
    SchedulerManager,
    CapabilityApprovalManager,
    CapabilityExpirySweeperManager,
    AgentSessionRepository,
    AgentCommandRepository,
    AgentRepoRepository,
    AgentEventRepository,
    DeviceRepository,
    RefreshTokenRepository,
    PairingRequestRepository,
    DeviceCodeRequestRepository,
    PolicyRepository,
    ScheduledCommandRepository,
    CapabilityInvocationRepository,
    AgentKeyGuard,
    DeviceAccessGuard,
    ScopeGuard,
    CompatAgentGuard,
  ],
  exports: [CapabilityApprovalManager],
})
export class AgentModule {}
