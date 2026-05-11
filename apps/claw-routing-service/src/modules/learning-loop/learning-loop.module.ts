import { Module } from '@nestjs/common';
import { LearningLoopController } from './controllers/learning-loop.controller';
import { LearningLoopService } from './services/learning-loop.service';
import { LearningLoopManager } from './managers/learning-loop.manager';
import { LearnedScoreRepository } from './repositories/learned-score.repository';

@Module({
  controllers: [LearningLoopController],
  providers: [LearningLoopService, LearningLoopManager, LearnedScoreRepository],
  exports: [LearningLoopManager, LearningLoopService],
})
export class LearningLoopModule {}
