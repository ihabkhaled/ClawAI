import { Controller, Get, Param } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { RuntimeV2ThreadActivityService } from '../services/runtime-v2-thread-activity.service';
import type { RuntimeV2ThreadActivity } from '../types/runtime-v2-thread-activity.types';

// Lives beside the run store rather than in the threads module, which does not
// (and should not) depend on Runtime V2. The path still reads as a thread query.
@Controller('chat-threads')
export class RuntimeV2ThreadActivityController {
  constructor(private readonly activity: RuntimeV2ThreadActivityService) {}

  @Get(':id/active-run')
  getActiveRun(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RuntimeV2ThreadActivity> {
    return this.activity.getActiveRun(user.id, id);
  }
}
