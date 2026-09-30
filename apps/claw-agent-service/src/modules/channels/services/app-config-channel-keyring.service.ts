import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { ChannelKeyring } from './channel-keyring';

/** The production keyring: the service encryption key and the public app URL. */
@Injectable()
export class AppConfigChannelKeyring extends ChannelKeyring {
  masterKey(): string {
    return AppConfig.get().ENCRYPTION_KEY;
  }

  publicOrigin(): string {
    return AppConfig.get().NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
}
