import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import { type Response } from 'express';

import { PluginImportError } from '../errors/plugin-import.error';

/** Sends a refusal as usual and adds `Retry-After` when the refusal carries a retry time. */
@Catch(PluginImportError)
export class PluginImportFilter implements ExceptionFilter<PluginImportError> {
  catch(exception: PluginImportError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception.retry !== undefined) {
      response.setHeader('Retry-After', String(exception.retry.afterSeconds));
    }
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
