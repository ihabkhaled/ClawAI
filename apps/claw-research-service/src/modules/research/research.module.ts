import { Module } from '@nestjs/common';

import { FetchModule } from '../fetch/fetch.module';
import { SearchModule } from '../search/search.module';
import { ResearchController } from './controllers/research.controller';
import { ResearchManager } from './managers/research.manager';
import { ResearchRunRepository } from './repositories/research-run.repository';
import { ResearchService } from './services/research.service';

@Module({
  imports: [SearchModule, FetchModule],
  controllers: [ResearchController],
  providers: [ResearchRunRepository, ResearchManager, ResearchService],
  exports: [ResearchManager, ResearchService],
})
export class ResearchModule {}
