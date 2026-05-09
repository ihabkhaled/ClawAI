import { Injectable, Logger } from '@nestjs/common';
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
    const config = AppConfig.get();
    if (rawBody.length > config.WEBHOOK_BODY_MAX_BYTES) {
      return this.persistRejection(
        provider,
        connectorId,
        rawBody,
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
        ipAddress,
        WEBHOOK_REJECTION_CODES.RATE_LIMITED,
      );
    }
    const verifier = findVerifier(provider);
    if (verifier === null) {
      return this.persistRejection(
        provider,
        connectorId,
        rawBody,
        ipAddress,
        WEBHOOK_REJECTION_CODES.UNSUPPORTED_PROVIDER,
      );
    }
    const secret = this.secretFor(provider);
    const verification = verifier.verify({ rawBody, headers }, secret);
    if (!verification.signatureValid) {
      return this.persistRejection(
        provider,
        connectorId,
        rawBody,
        ipAddress,
        verification.reason ?? WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID,
        verification.signature,
      );
    }
    if (verification.externalDeliveryId !== null) {
      const dup = await this.repo.findByExternalId(provider, verification.externalDeliveryId);
      if (dup !== null) {
        return { status: 'IDEMPOTENT', deliveryId: dup.id, signatureValid: true };
      }
    }
    const parsedBody = this.parseJson(rawBody);
    if (parsedBody === null) {
      return this.persistRejection(
        provider,
        connectorId,
        rawBody,
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
      bodyBytes: rawBody.length,
    });
    await this.publishReceived(row.id, provider, connectorId, verification, parsedBody);
    return { status: 'ACCEPTED', deliveryId: row.id, signatureValid: true };
  }

  async replay(deliveryId: string): Promise<{ deliveryId: string }> {
    const row = await this.repo.findById(deliveryId);
    if (row === null) throw new Error(`webhook delivery ${deliveryId} not found`);
    await this.publish(EventPattern.WORKSPACE_WEBHOOK_REPLAYED, {
      deliveryId: row.id,
      provider: row.provider,
      connectorId: row.connectorId,
      externalDeliveryId: row.externalDeliveryId,
      eventType: row.eventType,
      occurredAt: new Date().toISOString(),
    });
    await this.repo.markProcessed(row.id);
    return { deliveryId: row.id };
  }

  private async persistRejection(
    provider: WorkspaceProvider,
    connectorId: string | null,
    rawBody: Buffer,
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
      bodyBytes: rawBody.length,
    });
    await this.publish(EventPattern.WORKSPACE_WEBHOOK_REJECTED, {
      deliveryId: row.id,
      provider,
      connectorId,
      reasonCode,
      occurredAt: new Date().toISOString(),
    });
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
  ): Promise<void> {
    await this.publish(EventPattern.WORKSPACE_WEBHOOK_RECEIVED, {
      deliveryId,
      provider,
      connectorId,
      externalDeliveryId: verification.externalDeliveryId,
      eventType: verification.eventType,
      body,
      occurredAt: new Date().toISOString(),
    });
  }

  private async publish(pattern: EventPattern, payload: unknown): Promise<void> {
    try {
      await this.rabbitmq.publish(pattern, payload);
    } catch (error) {
      this.logger.warn(
        `failed to publish ${pattern} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
