import { Injectable, Logger } from '@nestjs/common';

import { RoutingMode } from '../../../generated/prisma';
import { SemanticIntentAnalyzerManager } from '../../intelligence/managers/semantic-intent-analyzer.manager';
import type {
  SemanticIntentAnalysisRecord,
  SemanticIntentAnalyzerInput,
} from '../../intelligence/types/semantic-intent-analysis.types';
import { PLAYGROUND_DEFAULT_THREAD_ID } from '../constants/playground.constants';
import type { AnalyzeSemanticDto } from '../dto/analyze-semantic.dto';

@Injectable()
export class PlaygroundService {
  private readonly logger = new Logger(PlaygroundService.name);

  constructor(private readonly semanticAnalyzer: SemanticIntentAnalyzerManager) {}

  // Phase 8 UI transparency — synchronous semantic analyzer pass.
  // Bypasses ROUTING_SEMANTIC_ANALYZER_ENABLED on purpose because the
  // playground is the diagnostics surface. The manager itself always
  // returns a record (it never throws) so we can render failures.
  async analyzeSemantic(dto: AnalyzeSemanticDto): Promise<SemanticIntentAnalysisRecord> {
    this.logger.debug(
      `analyzeSemantic: threadId=${dto.threadId ?? PLAYGROUND_DEFAULT_THREAD_ID} mode=${dto.routingMode ?? 'AUTO'} msgLen=${String(dto.message.length)}`,
    );
    const input = this.buildAnalyzerInput(dto);
    return this.semanticAnalyzer.analyzeWithForceEnabled(input);
  }

  // Maps the DTO into the analyzer input shape. Extracted to keep the
  // public method ≤30 lines.
  private buildAnalyzerInput(dto: AnalyzeSemanticDto): SemanticIntentAnalyzerInput {
    return {
      threadId: dto.threadId ?? PLAYGROUND_DEFAULT_THREAD_ID,
      message: dto.message,
      routingMode: dto.routingMode ?? RoutingMode.AUTO,
      recentMessages: dto.recentMessages,
      threadSummary: dto.threadSummary,
      followUpDetected: dto.followUpDetected,
      followUpSignals: dto.followUpSignals,
      keywordSignals: dto.keywordSignals ?? [],
      activePolicyName: dto.activePolicyName,
      availableWorkflowKinds: dto.availableWorkflowKinds,
    };
  }
}
