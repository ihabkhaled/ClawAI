import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import type { Prisma } from '../../../generated/prisma';
import { WEBHOOK_REJECTION_CODES } from '../constants/webhook-receiver.constants';
import { WebhookDeliveryRepository } from '../repositories/webhook-delivery.repository';
import type { WebhookReceiveResult } from '../types/webhook-manager.types';
import { findVerifier } from '../utilities/webhook-signature-verifiers.utility';

import { WebhookRateLimiterManager } from './webhook-rate-limiter.manager';

@Injectable()
export class WebhookReceiverManager {
  private readonly logger = new Logger(WebhookReceiverManager.name);

  constructor(
    private readonly repo: WebhookDeliveryRepository,
    private readonly rabbitmq: RabbitMQService,
    private readonly rateLimiter: WebhookRateLimiterManager,
  ) {}

  async receive(
    provider: WorkspaceProvider,
    connectorId: string | null,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    ipAddress: string | null,
  ): Promise<WebhookReceiveResult> {
    // rawBody arrives from express body-parser (validated by RawWebhookBodyPipe).
    // Re-assert the type with an Array.isArray + Buffer.isBuffer barrier so a
    // tampered array/object payload can never reach the .length / hashing path —
    // defends CodeQL "type confusion through parameter tampering" (alert #24).
    if (Array.isArray(rawBody) || !Buffer.isBuffer(rawBody)) {
      throw new TypeError('webhook receive(): rawBody must be a Buffer');
    }
    const bodyBytes = rawBody.length;
    const preflight = await this.runPreflight(provider, connectorId, rawBody, bodyBytes, ipAddress);
    if (preflight !== null) {
      return preflight;
    }
    const verification = await this.runVerification(
      provider,
      connectorId,
      rawBody,
      bodyBytes,
      headers,
      ipAddress,
    );
    if (verification.kind === 'rejected') {
      return verification.result;
    }
    const dedup = await this.checkDuplicate(provider, verification.externalDeliveryId);
    if (dedup !== null) {
      return dedup;
    }
    const parsedBody = this.parseJson(rawBody);
    if (parsedBody === null) {
      return this.persistRejection(
        provider,
        connectorId,
        rawBody,
        bodyBytes,
        ipAddress,
        WEBHOOK_REJECTION_CODES.MALFORMED_BODY,
      );
    }
    const row = await this.repo.create({
      connectorId,
      provider,
      externalDeliveryId: verification.externalDeliveryId,
      eventType: verification.eventType,
      signatureValid: true,
      signature: verification.signature,
      rawPayload: parsedBody as Prisma.InputJsonValue,
      errorMessage: null,
      ipAddress,
      bodyBytes,
    });
    const published = await this.publishReceived(
      row.id,
      provider,
      connectorId,
      {
        externalDeliveryId: verification.externalDeliveryId,
        eventType: verification.eventType,
      },
      parsedBody,
    );
    await this.repo.setPublishFailed(row.id, !published);
    return { status: 'ACCEPTED', deliveryId: row.id, signatureValid: true };
  }

  private async runPreflight(
    provider: WorkspaceProvider,
    connectorId: string | null,
    rawBody: Buffer,
    bodyBytes: number,
    ipAddress: string | null,
  ): Promise<WebhookReceiveResult | null> {
    const config = AppConfig.get();
    if (bodyBytes > config.WEBHOOK_BODY_MAX_BYTES) {
      return this.persistRejection(
        provider,
        connectorId,
        rawBody,
        bodyBytes,
        ipAddress,
        WEBHOOK_REJECTION_CODES.BODY_TOO_LARGE,
      );
    }
    const rateLimitKey = connectorId ?? `provider:${provider}`;
    if (!this.rateLimiter.tryReserve(rateLimitKey)) {
      return this.persistRejection(
        provider,
        connectorId,
        rawBody,
        bodyBytes,
        ipAddress,
        WEBHOOK_REJECTION_CODES.RATE_LIMITED,
      );
    }
    return null;
  }

  private async runVerification(
    provider: WorkspaceProvider,
    connectorId: string | null,
    rawBody: Buffer,
    bodyBytes: number,
    headers: Record<string, string | string[] | undefined>,
    ipAddress: string | null,
  ): Promise<
    | { kind: 'rejected'; result: WebhookReceiveResult }
    | {
        kind: 'verified';
        externalDeliveryId: string | null;
        eventType: string | null;
        signature: string | null;
      }
  > {
    const verifier = findVerifier(provider);
    if (verifier === null) {
      const result = await this.persistRejection(
        provider,
        connectorId,
        rawBody,
        bodyBytes,
        ipAddress,
        WEBHOOK_REJECTION_CODES.UNSUPPORTED_PROVIDER,
      );
      return { kind: 'rejected', result };
    }
    const secret = this.secretFor(provider);
    const verification = verifier.verify({ rawBody, headers }, secret);
    if (!verification.signatureValid) {
      const result = await this.persistRejection(
        provider,
        connectorId,
        rawBody,
        bodyBytes,
        ipAddress,
        verification.reason ?? WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID,
        verification.signature,
      );
      return { kind: 'rejected', result };
    }
    return {
      kind: 'verified',
      externalDeliveryId: verification.externalDeliveryId,
      eventType: verification.eventType,
      signature: verification.signature,
    };
  }

  private async checkDuplicate(
    provider: WorkspaceProvider,
    externalDeliveryId: string | null,
  ): Promise<WebhookReceiveResult | null> {
    if (externalDeliveryId === null) return null;
    const dup = await this.repo.findByExternalId(provider, externalDeliveryId);
    if (dup === null) return null;
    return { status: 'IDEMPOTENT', deliveryId: dup.id, signatureValid: true };
  }

  async replay(deliveryId: string): Promise<{ deliveryId: string }> {
    const row = await this.repo.findById(deliveryId);
    if (row === null) {
      throw new NotFoundException({ messageKey: 'WEBHOOK_DELIVERY_NOT_FOUND' });
    }
    const published = await this.publish(EventPattern.WORKSPACE_WEBHOOK_REPLAYED, {
      deliveryId: row.id,
      provider: row.provider,
      connectorId: row.connectorId,
      externalDeliveryId: row.externalDeliveryId,
      eventType: row.eventType,
      occurredAt: new Date().toISOString(),
    });
    // markProcessed always runs, even when the republish itself failed —
    // that's a deliberate, pre-existing, separately-documented behavior
    // (Phase 15) this fix doesn't change. What's new is that a failed
    // replay is now durably visible via publishFailedAt instead of only
    // an ephemeral warn log.
    await this.repo.markProcessed(row.id);
    await this.repo.setPublishFailed(row.id, !published);
    return { deliveryId: row.id };
  }

  private async persistRejection(
    provider: WorkspaceProvider,
    connectorId: string | null,
    rawBody: Buffer,
    bodyBytes: number,
    ipAddress: string | null,
    reasonCode: string,
    signature: string | null = null,
  ): Promise<WebhookReceiveResult> {
    const parsedBody = this.parseJsonOrSnippet(rawBody);
    const row = await this.repo.create({
      connectorId,
      provider,
      externalDeliveryId: null,
      eventType: null,
      signatureValid: false,
      signature,
      rawPayload: parsedBody as Prisma.InputJsonValue,
      errorMessage: reasonCode,
      ipAddress,
      bodyBytes,
    });
    const published = await this.publish(EventPattern.WORKSPACE_WEBHOOK_REJECTED, {
      deliveryId: row.id,
      provider,
      connectorId,
      reasonCode,
      occurredAt: new Date().toISOString(),
    });
    await this.repo.setPublishFailed(row.id, !published);
    return { status: 'REJECTED', deliveryId: row.id, signatureValid: false, reasonCode };
  }

  private secretFor(provider: WorkspaceProvider): string {
    const config = AppConfig.get();
    switch (provider) {
      case WorkspaceProvider.GITHUB:
        return config.GITHUB_WEBHOOK_SECRET;
      case WorkspaceProvider.GITLAB:
        return config.GITLAB_WEBHOOK_SECRET;
      case WorkspaceProvider.BITBUCKET:
        return config.BITBUCKET_WEBHOOK_SECRET;
      case WorkspaceProvider.JIRA:
        return config.JIRA_WEBHOOK_SECRET;
      case WorkspaceProvider.SLACK:
        return config.SLACK_SIGNING_SECRET;
      case WorkspaceProvider.FIGMA:
        return config.FIGMA_WEBHOOK_SECRET;
      default:
        return '';
    }
  }

  private parseJson(buffer: Buffer): Record<string, unknown> | unknown[] | null {
    try {
      const parsed = JSON.parse(buffer.toString('utf-8')) as unknown;
      if (parsed !== null && (Array.isArray(parsed) || typeof parsed === 'object')) {
        return parsed as Record<string, unknown> | unknown[];
      }
      return null;
    } catch {
      return null;
    }
  }

  private parseJsonOrSnippet(buffer: Buffer): Record<string, unknown> | unknown[] {
    const parsed = this.parseJson(buffer);
    if (parsed !== null) return parsed;
    return { snippet: buffer.subarray(0, 256).toString('utf-8') };
  }

  private async publishReceived(
    deliveryId: string,
    provider: WorkspaceProvider,
    connectorId: string | null,
    verification: { externalDeliveryId: string | null; eventType: string | null },
    body: Record<string, unknown> | unknown[],
  ): Promise<boolean> {
    return this.publish(EventPattern.WORKSPACE_WEBHOOK_RECEIVED, {
      deliveryId,
      provider,
      connectorId,
      externalDeliveryId: verification.externalDeliveryId,
      eventType: verification.eventType,
      body,
      occurredAt: new Date().toISOString(),
    });
  }

  // Returns whether the publish succeeded, so callers can persist a
  // durable publishFailedAt signal — the swallow itself (the webhook HTTP
  // response must never depend on RabbitMQ being reachable) is unchanged.
  private async publish(pattern: EventPattern, payload: unknown): Promise<boolean> {
    try {
      await this.rabbitmq.publish(pattern, payload);
      return true;
    } catch (error) {
      this.logger.warn(
        `failed to publish ${pattern} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }
}
