import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '../../common/errors';
import { ErrorResponseBody } from './types/error-response-body.type';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | undefined;
    let errors: unknown[] | undefined;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const responseObj = exResponse as Record<string, unknown>;
        message = (responseObj['message'] as string) ?? message;
        code = responseObj['code'] as string | undefined;
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const responseObj = exResponse as Record<string, unknown>;
        message = (responseObj['message'] as string) ?? exception.message;
        errors = responseObj['errors'] as unknown[] | undefined;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unknown exception thrown', String(exception));
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };

    if (code) {
      body.code = code;
    }

    if (errors) {
      body.errors = errors;
    }

    response.status(status).json(body);
  }
}
