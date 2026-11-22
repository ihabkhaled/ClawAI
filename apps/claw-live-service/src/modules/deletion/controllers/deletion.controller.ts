import { Controller, Delete, Param } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { historyIdParamSchema } from '../../history/dto/history.dto';
import { DeletionService } from '../services/deletion.service';
import type { DeletionSummary } from '../types/deletion.types';

@Controller('live/history')
export class DeletionController {
  constructor(private readonly deletion: DeletionService) {}

  @Delete()
  deleteAll(@CurrentUser() user: AuthenticatedUser): Promise<DeletionSummary> {
    return this.deletion.deleteAllHistory(user.id);
  }

  @Delete(':sessionId')
  deleteOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(historyIdParamSchema)) sessionId: string,
  ): Promise<DeletionSummary> {
    return this.deletion.deleteSession(user.id, sessionId);
  }
}
