import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';

import { AppConfig } from '../../../app/config/app.config';
import {
  PUSH_GONE_STATUS_CODES,
  PUSH_SEND_TIMEOUT_MS,
  PUSH_TTL_SECONDS,
} from '../constants/notifications.constants';
import { isAllowedPushEndpoint } from '../utilities/push-endpoint.utility';
import type {
  PushConfigView,
  PushMessagePayload,
  PushSendOutcome,
  PushSubscriptionInput,
  PushVapidKeys,
} from '../types/notifications.types';

/**
 * The one place that talks to a browser vendor's push service (rule 13: wrap the library).
 *
 * Push is on only when the WHOLE VAPID set is configured. A partial set is treated as off, so the
 * portal hides the switch instead of offering one that can only fail. Subscription endpoints are
 * credentials and are never logged.
 */
@Injectable()
export class WebPushAdapter {
  private readonly logger = new Logger(WebPushAdapter.name);

  getConfig(): PushConfigView {
    const keys = this.readKeys();
    return keys === null
      ? { enabled: false, publicKey: null }
      : { enabled: true, publicKey: keys.publicKey };
  }

  async send(
    subscription: PushSubscriptionInput,
    message: PushMessagePayload,
  ): Promise<PushSendOutcome> {
    const keys = this.readKeys();
    if (keys === null) {
      return 'FAILED';
    }
    if (!isAllowedPushEndpoint(subscription.endpoint)) {
      // A row saved before the allow-list, or tampered with: never call it, and drop it.
      return 'GONE';
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(message),
        {
          TTL: PUSH_TTL_SECONDS,
          timeout: PUSH_SEND_TIMEOUT_MS,
          vapidDetails: {
            subject: keys.subject,
            publicKey: keys.publicKey,
            privateKey: keys.privateKey,
          },
        },
      );
      return 'SENT';
    } catch (error) {
      if (
        error instanceof webpush.WebPushError &&
        PUSH_GONE_STATUS_CODES.includes(error.statusCode)
      ) {
        return 'GONE';
      }
      this.logger.warn('A push message could not be delivered');
      return 'FAILED';
    }
  }

  private readKeys(): PushVapidKeys | null {
    const config = AppConfig.get();
    const publicKey = config.VAPID_PUBLIC_KEY;
    const privateKey = config.VAPID_PRIVATE_KEY;
    const subject = config.VAPID_SUBJECT;
    return publicKey === undefined || privateKey === undefined || subject === undefined
      ? null
      : { publicKey, privateKey, subject };
  }
}
