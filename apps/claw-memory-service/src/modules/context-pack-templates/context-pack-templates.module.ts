import { Module } from '@nestjs/common';
import { ContextPacksModule } from '../context-packs/context-packs.module';
import { ContextPackTemplatesController } from './controllers/context-pack-templates.controller';
import { ContextPackTemplateRepository } from './repositories/context-pack-template.repository';
import { ContextPackTemplateService } from './services/context-pack-template.service';

@Module({
  imports: [ContextPacksModule],
  controllers: [ContextPackTemplatesController],
  providers: [ContextPackTemplateRepository, ContextPackTemplateService],
  exports: [ContextPackTemplateService],
})
export class ContextPackTemplatesModule {}
