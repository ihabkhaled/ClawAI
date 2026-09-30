import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import {
  CHANNEL_INBOUND_PATH,
  CHANNEL_MAX_BODY_BYTES,
  CHANNEL_SIGNATURE_HEADER,
  CHANNEL_TIMESTAMP_HEADER,
} from '../constants/channel.constants';
import { type ChannelInboundDto, channelInboundSchema } from '../dto/channel-inbound.dto';
import { storedChannelMessageSchema } from '../dto/stored-channel-message.dto';
import { ChannelInboxStore } from '../repositories/channel-inbox.store';
import {
  deriveChannelSecret,
  isFreshChannelTimestamp,
  isValidChannelSignature,
} from '../utilities/channel-signature.utility';
import { ChannelKeyring } from './channel-keyring';
import type {
  ChannelInboundHeaders,
  ChannelInboxEntry,
  ChannelInboxPage,
  ChannelIngestResult,
  ChannelMessage,
  ChannelWebhookInfo,
} from '../types/channel.types';

/**
 * Inbound channel messages: an external system (CI, an alerting tool) posts a
 * signed event for one owner, and that owner's editor reads and acknowledges it.
 *
 * The secret is never logged and never part of an error. A refused delivery
 * says only which check failed, so a sender can fix its setup.
 */
@Injectable()
export class ChannelInboxService {
  private readonly logger = new Logger(ChannelInboxService.name);

  constructor(
    private readonly store: ChannelInboxStore,
    private readonly keyring: ChannelKeyring,
  ) {}

  webhookInfo(userId: string): ChannelWebhookInfo {
    return {
      url: `${this.keyring.publicOrigin()}${CHANNEL_INBOUND_PATH}/${encodeURIComponent(userId)}`,
      secret: deriveChannelSecret(this.keyring.masterKey(), userId),
      signatureHeader: CHANNEL_SIGNATURE_HEADER,
      timestampHeader: CHANNEL_TIMESTAMP_HEADER,
      signatureFormat: 'sha256=HMAC_SHA256(secret, "<timestamp>.<raw body>") as hex',
    };
  }

  async ingest(
    userId: string,
    headers: ChannelInboundHeaders,
    rawBody: string,
    nowMs: number = Date.now(),
  ): Promise<ChannelIngestResult> {
    this.verify(userId, headers, rawBody, nowMs);
    const payload = this.parse(rawBody);
    const message: ChannelMessage = {
      id: randomUUID(),
      kind: payload.kind,
      source: payload.source,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      receivedAt: new Date(nowMs).toISOString(),
    };
    await this.store.append(userId, message);
    this.logger.log(`channel message ${message.id} accepted (kind=${message.kind})`);
    return { accepted: true, id: message.id };
  }

  async list(userId: string, limit: number): Promise<ChannelInboxPage> {
    const entries = await this.readEntries(userId);
    return { messages: entries.slice(0, limit).map((entry) => entry.message) };
  }

  async ack(userId: string, id: string): Promise<void> {
    const entries = await this.readEntries(userId);
    const entry = entries.find((candidate) => candidate.message.id === id);
    const removed = entry === undefined ? false : await this.store.removeRaw(userId, entry.raw);
    if (!removed) {
      throw new BusinessException(
        'agent.channel.message_not_found',
        'channel_message_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private verify(
    userId: string,
    headers: ChannelInboundHeaders,
    rawBody: string,
    nowMs: number,
  ): void {
    if (Buffer.byteLength(rawBody, 'utf8') > CHANNEL_MAX_BODY_BYTES) {
      throw new BusinessException(
        'agent.channel.payload_too_large',
        'channel_payload_too_large',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const { signature, timestamp } = headers;
    if (signature === undefined || timestamp === undefined) {
      throw this.unauthorized('channel_signature_missing');
    }
    if (!isFreshChannelTimestamp(timestamp, nowMs)) {
      throw this.unauthorized('channel_timestamp_stale');
    }
    const secret = deriveChannelSecret(this.keyring.masterKey(), userId);
    if (!isValidChannelSignature(secret, timestamp, rawBody, signature)) {
      throw this.unauthorized('channel_signature_invalid');
    }
  }

  private parse(rawBody: string): ChannelInboundDto {
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new BusinessException('agent.channel.invalid_payload', 'channel_invalid_payload');
    }
    const parsed = channelInboundSchema.safeParse(json);
    if (!parsed.success) {
      throw new BusinessException('agent.channel.invalid_payload', 'channel_invalid_payload');
    }
    return parsed.data;
  }

  private async readEntries(userId: string): Promise<ChannelInboxEntry[]> {
    const raws = await this.store.listRaw(userId);
    const entries: ChannelInboxEntry[] = [];
    for (const raw of raws) {
      const message = this.decode(raw);
      if (message !== null) entries.push({ raw, message });
    }
    return entries;
  }

  private decode(raw: string): ChannelMessage | null {
    try {
      const parsed = storedChannelMessageSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private unauthorized(code: string): BusinessException {
    return new BusinessException(`agent.${code}`, code, HttpStatus.UNAUTHORIZED);
  }
}
