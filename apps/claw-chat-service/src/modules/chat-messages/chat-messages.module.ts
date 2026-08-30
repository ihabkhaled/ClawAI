import { Module } from '@nestjs/common';
import { ChatMessagesController } from './controllers/chat-messages.controller';
import { ChatStreamController } from './controllers/chat-stream.controller';
import { ChatInternalController } from './controllers/chat-internal.controller';
import { ChatMessagesService } from './services/chat-messages.service';
import { AnswerRepairManager } from './managers/answer-repair.manager';
import { BestOfNManager } from './managers/best-of-n.manager';
import { TaskDecompositionManager } from './managers/task-decomposition.manager';
import { ChatExecutionManager } from './managers/chat-execution.manager';
import { GeminiFilesApiManager } from './managers/gemini-files-api.manager';
import { ConsensusExecutionManager } from './managers/consensus-execution.manager';
import { ContextAssemblyManager } from './managers/context-assembly.manager';
import { ContextComposerManager } from './managers/context-composer.manager';
import { EscalationChainManager } from './managers/escalation-chain.manager';
import { FallbackExecutorManager } from './managers/fallback-executor.manager';
import { ParallelExecutionManager } from './managers/parallel-execution.manager';
import { ResearchEnricherManager } from './managers/research-enricher.manager';
import { QualityCheckManager } from './managers/quality-check.manager';
import { JudgeRefereeManager } from './managers/judge-referee.manager';
import { VerifierManager } from './managers/verifier.manager';
import { PipelineManager } from './managers/pipeline.manager';
import { CostEnsembleManager } from './managers/cost-ensemble.manager';
import { RolePackManager } from './managers/role-pack.manager';
import { SearchFirstManager } from './managers/search-first.manager';
import { ChatStreamBusService } from './services/chat-stream-bus.service';
import { ChatStreamService } from './services/chat-stream.service';
import { RouterTraceStreamService } from './services/router-trace-stream.service';
import { StreamCancellationService } from './services/stream-cancellation.service';
import { StreamControlService } from './services/stream-control.service';
import { ProviderStreamExecutor } from './managers/provider-stream-executor.manager';
import { ModelAuthorizationMetricsService } from './services/model-authorization-metrics.service';
import { AccessControlService } from './services/access-control.service';
import { AdvancedModuleModelSelectionService } from './services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from './services/local-model-selection.service';
import { ChatMessagesRepository } from './repositories/chat-messages.repository';
import { FileDeliveryRecordRepository } from './repositories/file-delivery-record.repository';
import { FileDeliveryRecordService } from './services/file-delivery-record.service';
import { ChatThreadsRepository } from '../chat-threads/repositories/chat-threads.repository';
import { ContextReceiptsModule } from '../context-receipts/context-receipts.module';
import { RuntimeV2RunController } from './controllers/runtime-v2-run.controller';
import { RuntimeV2Store } from './repositories/runtime-v2.store';
import { RuntimeV2AccessService } from './services/runtime-v2-access.service';
import { RuntimeV2RunService } from './services/runtime-v2-run.service';
import { RuntimeV2StreamService } from './services/runtime-v2-stream.service';
import { RuntimeV2CommandController } from './controllers/runtime-v2-command.controller';
import { RuntimeV2CommandService } from './services/runtime-v2-command.service';
import { RuntimeV2LoopManager } from './managers/runtime-v2-loop.manager';

@Module({
  imports: [ContextReceiptsModule],
  controllers: [
    ChatMessagesController,
    ChatStreamController,
    ChatInternalController,
    RuntimeV2RunController,
    RuntimeV2CommandController,
  ],
  providers: [
    ChatMessagesService,
    AnswerRepairManager,
    BestOfNManager,
    TaskDecompositionManager,
    ChatExecutionManager,
    GeminiFilesApiManager,
    ConsensusExecutionManager,
    ContextAssemblyManager,
    ContextComposerManager,
    EscalationChainManager,
    FallbackExecutorManager,
    ParallelExecutionManager,
    ResearchEnricherManager,
    QualityCheckManager,
    JudgeRefereeManager,
    VerifierManager,
    PipelineManager,
    CostEnsembleManager,
    RolePackManager,
    SearchFirstManager,
    ChatStreamBusService,
    ChatStreamService,
    RouterTraceStreamService,
    StreamCancellationService,
    StreamControlService,
    ProviderStreamExecutor,
    AccessControlService,
    ModelAuthorizationMetricsService,
    AdvancedModuleModelSelectionService,
    LocalModelSelectionService,
    ChatMessagesRepository,
    FileDeliveryRecordRepository,
    FileDeliveryRecordService,
    ChatThreadsRepository,
    RuntimeV2Store,
    RuntimeV2AccessService,
    RuntimeV2RunService,
    RuntimeV2StreamService,
    RuntimeV2CommandService,
    RuntimeV2LoopManager,
  ],
  exports: [ChatMessagesService, ChatMessagesRepository, FileDeliveryRecordService],
})
export class ChatMessagesModule {}
