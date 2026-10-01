import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreateRoutineSecretDto,
  createRoutineSecretSchema,
  type ReplaceRoutineSecretDto,
  replaceRoutineSecretSchema,
  routineSecretNameSchema,
  type SetRoutineSecretsPolicyDto,
  setRoutineSecretsPolicySchema,
} from '../dto/routine-secret.dto';
import { RoutineSecretService } from '../services/routine-secret.service';
import type {
  RoutineSecretList,
  RoutineSecretMetadata,
  RoutineSecretsPolicy,
} from '../types/routine-secret.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

/**
 * F099 step 2: owner routes for a prompt routine's secrets. User JWT only, every call
 * scoped to the caller; a routine that is not theirs is the same 404 as a missing one.
 * Values are write-only: no route returns one, and none echoes the request body.
 */
@Controller('agent/scheduled-commands/:id')
export class RoutineSecretController {
  constructor(private readonly secrets: RoutineSecretService) {}

  @Get('secrets')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RoutineSecretList> {
    return this.secrets.list(user.id, id);
  }

  @Post('secrets')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createRoutineSecretSchema)) dto: CreateRoutineSecretDto,
  ): Promise<RoutineSecretMetadata> {
    return this.secrets.create(user.id, id, dto.name, dto.value);
  }

  @Put('secrets/:name')
  async replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('name', new ZodValidationPipe(routineSecretNameSchema)) name: string,
    @Body(new ZodValidationPipe(replaceRoutineSecretSchema)) dto: ReplaceRoutineSecretDto,
  ): Promise<RoutineSecretMetadata> {
    return this.secrets.replace(user.id, id, name, dto.value);
  }

  @Delete('secrets/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('name', new ZodValidationPipe(routineSecretNameSchema)) name: string,
  ): Promise<void> {
    await this.secrets.remove(user.id, id, name);
  }

  @Put('secrets-policy')
  async setPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setRoutineSecretsPolicySchema)) dto: SetRoutineSecretsPolicyDto,
  ): Promise<RoutineSecretsPolicy> {
    return this.secrets.setPolicy(user.id, id, dto.webhookRunsReceiveSecrets);
  }
}
