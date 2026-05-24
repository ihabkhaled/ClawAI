import { Module } from '@nestjs/common';
import { ContextPacksModule } from '../context-packs/context-packs.module';
import { ContextPackVersionsController } from './controllers/context-pack-versions.controller';
import { ContextPackVersionRepository } from './repositories/context-pack-version.repository';
import { ContextPackVersionService } from './services/context-pack-version.service';

@Module({
  imports: [ContextPacksModule],
  controllers: [ContextPackVersionsController],
  providers: [ContextPackVersionRepository, ContextPackVersionService],
  exports: [ContextPackVersionService],
})
export class ContextPackVersionsModule {}
