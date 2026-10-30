import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { type ModelAccessDto, modelAccessSchema } from '../dto/model-access.dto';
import { AccessControlService } from '../services/access-control.service';
import { type ModelAccessEntry } from '../types/access-control.types';

@Controller('chat-messages')
export class ModelAccessController {
  constructor(private readonly accessControlService: AccessControlService) {}

  // Which of these models the signed-in user may pick, so the model picker can dim the rest.
  // It decides nothing: the send path is still the gate, and answers from the same function.
  @Post('model-access')
  async modelAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(modelAccessSchema)) dto: ModelAccessDto,
  ): Promise<ModelAccessEntry[]> {
    return this.accessControlService.listModelAccess(user.id, dto.models);
  }
}
