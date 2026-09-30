import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { ChannelInboxController } from './controllers/channel-inbox.controller';
import { ChannelWebhookController } from './controllers/channel-webhook.controller';
import { ChannelInboxRepository } from './repositories/channel-inbox.repository';
import { ChannelInboxStore } from './repositories/channel-inbox.store';
import { AppConfigChannelKeyring } from './services/app-config-channel-keyring.service';
import { ChannelInboxService } from './services/channel-inbox.service';
import { ChannelKeyring } from './services/channel-keyring';

/**
 * Channels (F083): signed inbound events delivered into an owner's inbox,
 * which the coding-agent extension reads, surfaces, and acknowledges.
 */
@Module({
  imports: [RedisModule],
  controllers: [ChannelInboxController, ChannelWebhookController],
  providers: [
    ChannelInboxService,
    { provide: ChannelInboxStore, useClass: ChannelInboxRepository },
    { provide: ChannelKeyring, useClass: AppConfigChannelKeyring },
  ],
})
export class ChannelsModule {}
