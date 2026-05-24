import { Module } from '@nestjs/common';
import { MemoryModule } from '../memory/memory.module';
import { MemoryPortableController } from './controllers/memory-portable.controller';
import { MemoryPortableService } from './services/memory-portable.service';

@Module({
  imports: [MemoryModule],
  controllers: [MemoryPortableController],
  providers: [MemoryPortableService],
})
export class MemoryPortableModule {}
