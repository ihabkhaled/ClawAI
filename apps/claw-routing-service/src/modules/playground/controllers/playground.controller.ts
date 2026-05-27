import { Body, Controller, Post } from '@nestjs/common';

import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import type { SemanticIntentAnalysisRecord } from '../../intelligence/types/semantic-intent-analysis.types';
import { type AnalyzeSemanticDto, analyzeSemanticSchema } from '../dto/analyze-semantic.dto';
import { PlaygroundService } from '../services/playground.service';

@Controller('routing/playground')
export class PlaygroundController {
  constructor(private readonly service: PlaygroundService) {}

  // Phase 8 UI transparency — admin-only because the analyzer hits the
  // Ollama router model and we don't want every user spinning up
  // synthetic runs from the playground.
  @Post('analyze-semantic')
  @Roles(UserRole.ADMIN)
  async analyzeSemantic(
    @Body(new ZodValidationPipe(analyzeSemanticSchema)) dto: AnalyzeSemanticDto,
  ): Promise<SemanticIntentAnalysisRecord> {
    return this.service.analyzeSemantic(dto);
  }
}
