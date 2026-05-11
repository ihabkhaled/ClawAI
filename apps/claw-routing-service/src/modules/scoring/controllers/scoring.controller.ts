import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { ScoringService } from '../services/scoring.service';
import { type ScoreRequestDto, scoreRequestSchema } from '../dto/score.dto';
import { type ScoringOutput } from '../types/scoring.types';

@Controller('routing/score')
export class ScoringController {
  constructor(private readonly service: ScoringService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async score(
    @Body(new ZodValidationPipe(scoreRequestSchema)) dto: ScoreRequestDto,
  ): Promise<ScoringOutput> {
    return this.service.score(dto);
  }
}
