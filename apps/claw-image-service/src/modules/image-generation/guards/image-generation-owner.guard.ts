import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../../common/types';
import type { OwnedGenerationRequestParams } from '../types/image-owner-guard.types';
import { ImageGenerationService } from '../services/image-generation.service';

/**
 * Refuses a generation the caller does not own BEFORE a stream opens.
 *
 * Checking inside an SSE handler is too late: Nest has already sent 200 and
 * can only emit an error event. As a guard, a stranger gets the same 404 as a
 * GET of someone else's generation (or of a missing id), and no stream at all.
 * Mirrors `FileGenerationOwnerGuard` in file-generation-service.
 */
@Injectable()
export class ImageGenerationOwnerGuard implements CanActivate {
  constructor(private readonly imageService: ImageGenerationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & OwnedGenerationRequestParams>();
    await this.imageService.getByIdForUser(request.params['id'] ?? '', request.user.id);
    return true;
  }
}
