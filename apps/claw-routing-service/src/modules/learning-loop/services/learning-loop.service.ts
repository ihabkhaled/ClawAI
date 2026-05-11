import { Injectable } from '@nestjs/common';
import { LearningLoopManager } from '../managers/learning-loop.manager';
import { type RecordFeedbackDto } from '../dto/record-feedback.dto';
import { type LearnedScoreRecord } from '../types/learning-loop.types';

@Injectable()
export class LearningLoopService {
  constructor(private readonly manager: LearningLoopManager) {}

  async recordFeedback(dto: RecordFeedbackDto): Promise<LearnedScoreRecord> {
    return this.manager.recordFeedback(dto);
  }

  async listForProfile(profileKey: string): Promise<LearnedScoreRecord[]> {
    return this.manager.listForProfile(profileKey);
  }
}
