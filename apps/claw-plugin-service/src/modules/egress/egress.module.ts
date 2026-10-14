import { Module } from '@nestjs/common';

import { SafeEgressManager } from './managers/safe-egress.manager';
import { DnsHostResolver } from './resolvers/dns-host.resolver';
import { HostResolver } from './resolvers/host-resolver';
import { EgressTransport } from './transports/egress.transport';
import { PinnedHttpsTransport } from './transports/pinned-https.transport';

@Module({
  providers: [
    SafeEgressManager,
    { provide: HostResolver, useClass: DnsHostResolver },
    { provide: EgressTransport, useClass: PinnedHttpsTransport },
  ],
  exports: [SafeEgressManager],
})
export class EgressModule {}
