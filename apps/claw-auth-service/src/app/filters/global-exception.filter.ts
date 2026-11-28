import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { isClientHttpError } from '@claw/shared-utilities';
import { Response } from 'express';
import { BusinessException } from '../../common/errors';
import { type AuthenticatedRequest, type BusinessExceptionDetails } from '../../common/types';
import { SOURCE_AUTH_HTTP } from '../../modules/abuse-defense/constants/abuse-defense.constants';
import { AbuseSignalService } from '../../modules/abuse-defense/services/abuse-signal.service';
import { classifyAbuseSignal } from '../../modules/abuse-defense/utilities/abuse-signal-classifier.utility';
import { RETRY_AFTER_HEADER } from '../../modules/auth/constants/auth-rate-limit.constants';
import { ErrorResponseBody } from './types/error-response-body.type';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  // @Inject names the class token on purpose: the parameter's TYPE is a Pick<>, which TypeScript
  // emits as `Object`, and Nest cannot resolve `Object` (the dev container crash-looped on exactly that,
  // 2026-11-28). The narrow type is what lets a spec pass `{ record }` without a cast.
  constructor(
    @Inject(AbuseSignalService) private readonly abuse: Pick<AbuseSignalService, 'record'>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | undefined;
    let errors: unknown[] | undefined;
    let details: BusinessExceptionDetails | undefined;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const responseObj = exResponse as Record<string, unknown>;
        message = (responseObj['message'] as string) ?? message;
        code = responseObj['code'] as string | undefined;
        details = responseObj['details'] as BusinessExceptionDetails | undefined;
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const responseObj = exResponse as Record<string, unknown>;
        message = (responseObj['message'] as string) ?? exception.message;
        errors = responseObj['errors'] as unknown[] | undefined;
        const rawCode = responseObj['code'];
        code = typeof rawCode === 'string' ? rawCode : undefined;
      } else {
        message = exception.message;
      }
      // The throttler's 429 carries no code of its own; give it one so a
      // client can say "too many attempts" instead of a generic failure.
      if (status === HttpStatus.TOO_MANY_REQUESTS && code === undefined) {
        code = 'RATE_LIMITED';
      }
    } else if (isClientHttpError(exception)) {
      // Thrown by body-parser before the request reaches Nest: an oversized or
      // malformed body is the caller's mistake, not a server fault (TD-032).
      status = exception.status;
      message = exception.message;
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unknown exception thrown', String(exception));
    }

    this.reportAbuse(
      exception,
      status,
      ctx.getRequest<Partial<AuthenticatedRequest> | undefined>(),
    );

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };

    if (code) {
      body.code = code;
      body.errorCode = code;
    }

    if (errors) {
      body.errors = errors;
    }

    if (details) {
      this.copyDetails(body, details);
      if (details.retryAfterSeconds !== undefined) {
        response.setHeader(RETRY_AFTER_HEADER, String(details.retryAfterSeconds));
      }
    }

    response.status(status).json(body);
  }

  // What a refusal of an AUTHENTICATED request says about the account that sent it (ADR-233): its own
  // token hit a 429, or was refused by a role or permission guard. A request with no valid token has
  // no `user` and counts for nothing, so an attacker's failed sign-ins can never be charged to the
  // account they target. Fire-and-forget: AbuseSignalService.record never rejects and never delays a reply.
  private reportAbuse(
    exception: unknown,
    status: number,
    request: Partial<AuthenticatedRequest> | undefined,
  ): void {
    const userId = request?.user?.id;
    const code = classifyAbuseSignal(exception, status);
    if (typeof userId === 'string' && code !== null) {
      void this.abuse.record({ userId, code, source: SOURCE_AUTH_HTTP });
    }
  }

  // Copied field by field, not spread: only the declared keys may reach a
  // response body a customer can read.
  private copyDetails(body: ErrorResponseBody, details: BusinessExceptionDetails): void {
    body.availableMicroUsd = details.availableMicroUsd;
    body.requiredMicroUsd = details.requiredMicroUsd;
    if (details.banPermanent !== undefined) {
      body.banPermanent = details.banPermanent;
      body.bannedUntil = details.bannedUntil ?? null;
    }
    if (details.autoSuspended === true) {
      body.autoSuspended = true;
    }
    if (details.field !== undefined) {
      body.field = details.field;
    }
    if (details.retryAfterSeconds !== undefined) {
      body.retryAfterSeconds = details.retryAfterSeconds;
    }
  }
}
