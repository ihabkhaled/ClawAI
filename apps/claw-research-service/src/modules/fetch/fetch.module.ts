import { Module } from '@nestjs/common';

import { HttpFetchAdapter } from './adapters/http-fetch.adapter';
import { FetchController } from './controllers/fetch.controller';
import { FetchJobRepository } from './repositories/fetch-job.repository';
import { PageCacheRepository } from './repositories/page-cache.repository';
import { FetchService } from './services/fetch.service';

@Module({
  controllers: [FetchController],
  providers: [HttpFetchAdapter, FetchJobRepository, PageCacheRepository, FetchService],
  exports: [FetchService],
})
export class FetchModule {}
