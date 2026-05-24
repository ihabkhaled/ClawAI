import { Module } from '@nestjs/common';
import { ContextPacksModule } from '../context-packs/context-packs.module';
import { ContextPackPortableController } from './controllers/context-pack-portable.controller';
import { ContextPackPortableService } from './services/context-pack-portable.service';

@Module({
  imports: [ContextPacksModule],
  controllers: [ContextPackPortableController],
  providers: [ContextPackPortableService],
})
export class ContextPackPortableModule {}
