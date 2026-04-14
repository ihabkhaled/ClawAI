import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { AgentSessionController } from './controllers/agent-session.controller';
import { AgentCommandController } from './controllers/agent-command.controller';
import { AgentRepoController } from './controllers/agent-repo.controller';
import { AgentEventController } from './controllers/agent-event.controller';
import { AgentSessionService } from './services/agent-session.service';
import { AgentCommandService } from './services/agent-command.service';
import { AgentRepoService } from './services/agent-repo.service';
import { AgentEventService } from './services/agent-event.service';
import { AgentSessionManager } from './managers/agent-session.manager';
import { AgentCommandManager } from './managers/agent-command.manager';
import { AgentSessionRepository } from './repositories/agent-session.repository';
import { AgentCommandRepository } from './repositories/agent-command.repository';
import { AgentRepoRepository } from './repositories/agent-repo.repository';
import { AgentEventRepository } from './repositories/agent-event.repository';
import { AgentKeyGuard } from '../../common/guards/agent-key.guard';

@Module({
  imports: [PrismaModule],
  controllers: [
    AgentSessionController,
    AgentCommandController,
    AgentRepoController,
    AgentEventController,
  ],
  providers: [
    AgentSessionService,
    AgentCommandService,
    AgentRepoService,
    AgentEventService,
    AgentSessionManager,
    AgentCommandManager,
    AgentSessionRepository,
    AgentCommandRepository,
    AgentRepoRepository,
    AgentEventRepository,
    AgentKeyGuard,
  ],
})
export class AgentModule {}
