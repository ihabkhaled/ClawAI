import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../../common/types';
import { FileGenerationService } from '../services/file-generation.service';

/**
 * Refuses a generation the caller does not own BEFORE a stream opens.
 *
 * Checking inside an SSE handler is too late: Nest has already sent 200 and
 * can only emit an error event. As a guard, a stranger gets the same status
 * as a GET of someone else's generation, and no stream at all.
 */
@Injectable()
export class FileGenerationOwnerGuard implements CanActivate {
  constructor(private readonly fileGenService: FileGenerationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: Record<string, string | undefined> }>();
    await this.fileGenService.getByIdForUser(request.params['id'] ?? '', request.user.id);
    return true;
  }
}
