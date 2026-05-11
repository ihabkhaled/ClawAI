import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { LearningLoopService } from '../services/learning-loop.service';
import { type RecordFeedbackDto, recordFeedbackSchema } from '../dto/record-feedback.dto';
import { type LearnedScoreRecord } from '../types/learning-loop.types';

@Controller('routing/learning-loop')
export class LearningLoopController {
  constructor(private readonly service: LearningLoopService) {}

  @Post('feedback')
  async recordFeedback(
    @Body(new ZodValidationPipe(recordFeedbackSchema)) dto: RecordFeedbackDto,
  ): Promise<LearnedScoreRecord> {
    return this.service.recordFeedback(dto);
  }

  @Get('profile/:profileKey')
  async listForProfile(
    @Param('profileKey') profileKey: string,
  ): Promise<{ data: LearnedScoreRecord[] }> {
    const data = await this.service.listForProfile(profileKey);
    return { data };
  }
}
