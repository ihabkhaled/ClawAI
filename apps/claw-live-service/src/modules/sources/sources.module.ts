import { Module } from '@nestjs/common';

import { HlsProxyController } from './controllers/hls-proxy.controller';
import { FixtureBroadcasterService } from './services/fixture-broadcaster.service';
import { HlsFetcherService } from './services/hls-fetcher.service';
import { HlsProxyService } from './services/hls-proxy.service';
import { SourceUrlGuardService } from './services/source-url-guard.service';
import { SourcesService } from './services/sources.service';

/** Source resolution, the SSRF guard, the HLS proxy and the fixture broadcaster (section 1). */
@Module({
  controllers: [HlsProxyController],
  providers: [
    SourcesService,
    SourceUrlGuardService,
    HlsFetcherService,
    HlsProxyService,
    FixtureBroadcasterService,
  ],
  exports: [SourcesService, FixtureBroadcasterService, HlsFetcherService, SourceUrlGuardService],
})
export class SourcesModule {}
