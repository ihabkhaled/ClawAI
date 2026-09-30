import { Module } from '@nestjs/common';

import { PromptLibraryController } from './controllers/prompt-library.controller';
import { PromptLibraryRepository } from './repositories/prompt-library.repository';
import { PromptLibraryService } from './services/prompt-library.service';

@Module({
  controllers: [PromptLibraryController],
  providers: [PromptLibraryService, PromptLibraryRepository],
  exports: [PromptLibraryService],
})
export class PromptLibraryModule {}
