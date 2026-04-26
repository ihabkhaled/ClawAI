import { Module } from '@nestjs/common';
import { ChatMessagesController } from './controllers/chat-messages.controller';
import { ChatStreamController } from './controllers/chat-stream.controller';
import { ChatInternalController } from './controllers/chat-internal.controller';
import { ChatMessagesService } from './services/chat-messages.service';
import { AnswerRepairManager } from './managers/answer-repair.manager';
import { BestOfNManager } from './managers/best-of-n.manager';
import { TaskDecompositionManager } from './managers/task-decomposition.manager';
import { ChatExecutionManager } from './managers/chat-execution.manager';
import { ConsensusExecutionManager } from './managers/consensus-execution.manager';
import { ContextAssemblyManager } from './managers/context-assembly.manager';
import { EscalationChainManager } from './managers/escalation-chain.manager';
import { ParallelExecutionManager } from './managers/parallel-execution.manager';
import { QualityCheckManager } from './managers/quality-check.manager';
import { JudgeRefereeManager } from './managers/judge-referee.manager';
import { VerifierManager } from './managers/verifier.manager';
import { PipelineManager } from './managers/pipeline.manager';
import { CostEnsembleManager } from './managers/cost-ensemble.manager';
import { RolePackManager } from './managers/role-pack.manager';
import { ChatStreamService } from './services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from './services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from './services/local-model-selection.service';
import { ChatMessagesRepository } from './repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../chat-threads/repositories/chat-threads.repository';

@Module({
  controllers: [ChatMessagesController, ChatStreamController, ChatInternalController],
  providers: [
    ChatMessagesService,
    AnswerRepairManager,
    BestOfNManager,
    TaskDecompositionManager,
    ChatExecutionManager,
    ConsensusExecutionManager,
    ContextAssemblyManager,
    EscalationChainManager,
    ParallelExecutionManager,
    QualityCheckManager,
    JudgeRefereeManager,
    VerifierManager,
    PipelineManager,
    CostEnsembleManager,
    RolePackManager,
    ChatStreamService,
    AdvancedModuleModelSelectionService,
    LocalModelSelectionService,
    ChatMessagesRepository,
    ChatThreadsRepository,
  ],
  exports: [ChatMessagesService, ChatMessagesRepository],
})
export class ChatMessagesModule {}
