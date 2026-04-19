import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WEBHOOK_PROVIDER_METADATA } from '../constants/webhook.constants';
import { WebhookProviderKind } from '../enums/webhook-provider-kind.enum';
import { BusinessException } from '../errors/business.exception';
import {
  verifyGithubSignature,
  verifySlackSignature,
} from '../utilities/webhook-signature.utility';
import type { WebhookGuardRequest } from './webhook.types';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const kind = this.reflector.get<WebhookProviderKind | undefined>(
      WEBHOOK_PROVIDER_METADATA,
      context.getHandler(),
    );
    if (kind === undefined) {
      throw new BusinessException(
        'WebhookSignatureGuard used without @WebhookProvider() metadata',
        'WEBHOOK_CONFIG_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const request = context.switchToHttp().getRequest<WebhookGuardRequest>();
    const body = this.resolveRawBody(request);
    const secret = this.resolveSecret(request);
    if (secret === undefined) {
      throw new BusinessException(
        'Webhook secret is not configured for this request',
        'WEBHOOK_SECRET_MISSING',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (kind === WebhookProviderKind.GITHUB) {
      const header = this.header(request, 'x-hub-signature-256');
      if (!verifyGithubSignature(body, header, secret)) {
        this.reject('GitHub webhook signature invalid');
      }
      return true;
    }
    if (kind === WebhookProviderKind.SLACK) {
      const tsHeader = this.header(request, 'x-slack-request-timestamp');
      const sigHeader = this.header(request, 'x-slack-signature');
      if (!verifySlackSignature(body, tsHeader, sigHeader, secret)) {
        this.reject('Slack webhook signature invalid');
      }
      return true;
    }
    this.reject(`Unsupported webhook kind ${String(kind)}`);
    return false;
  }

  /**
   * Upstream middleware/interceptor MUST set `request.webhookSecret` by
   * resolving the matching `WorkspaceProviderAppConfig` before this guard
   * runs. Without it we reject with WEBHOOK_SECRET_MISSING.
   */
  private resolveSecret(request: WebhookGuardRequest): string | undefined {
    const value = request.webhookSecret;
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private resolveRawBody(request: WebhookGuardRequest): string {
    if (typeof request.rawBody === 'string' && request.rawBody.length > 0) {
      return request.rawBody;
    }
    if (Buffer.isBuffer(request.rawBody)) {
      return request.rawBody.toString('utf8');
    }
    if (request.body !== undefined) {
      return JSON.stringify(request.body);
    }
    return '';
  }

  private header(request: WebhookGuardRequest, name: string): string | undefined {
    const value = request.headers[name.toLowerCase()] ?? request.headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return typeof value === 'string' ? value : undefined;
  }

  private reject(message: string): void {
    this.logger.warn(message);
    throw new BusinessException(
      'workspace.webhook.invalid_signature',
      'INVALID_WEBHOOK_SIGNATURE',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
