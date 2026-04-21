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
import { CommandStreamService } from './services/command-stream.service';
import { AgentSessionManager } from './managers/agent-session.manager';
import { AgentCommandManager } from './managers/agent-command.manager';
import { PairingCleanupManager } from './managers/pairing-cleanup.manager';
import { RefreshCleanupManager } from './managers/refresh-cleanup.manager';
import { AgentSessionRepository } from './repositories/agent-session.repository';
import { AgentCommandRepository } from './repositories/agent-command.repository';
import { AgentRepoRepository } from './repositories/agent-repo.repository';
import { AgentEventRepository } from './repositories/agent-event.repository';
import { DeviceRepository } from './repositories/device.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { PairingRequestRepository } from './repositories/pairing-request.repository';
import { DeviceCodeRequestRepository } from './repositories/device-code-request.repository';
import { PolicyRepository } from './repositories/policy.repository';
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
    CommandStreamService,
    AgentSessionManager,
    AgentCommandManager,
    PairingCleanupManager,
    RefreshCleanupManager,
    AgentSessionRepository,
    AgentCommandRepository,
    AgentRepoRepository,
    AgentEventRepository,
    DeviceRepository,
    RefreshTokenRepository,
    PairingRequestRepository,
    DeviceCodeRequestRepository,
    PolicyRepository,
    AgentKeyGuard,
    DeviceAccessGuard,
    ScopeGuard,
    CompatAgentGuard,
  ],
})
export class AgentModule {}
