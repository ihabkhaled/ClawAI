import { Module } from '@nestjs/common';

import { IntelligenceModule } from '../intelligence/intelligence.module';

import { PlaygroundController } from './controllers/playground.controller';
import { PlaygroundService } from './services/playground.service';

@Module({
  imports: [IntelligenceModule],
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
  exports: [PlaygroundService],
})
export class PlaygroundModule {}
