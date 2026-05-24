import { Body, Controller, Get, Put } from '@nestjs/common';
import type { MemoryPreference } from '../../../generated/prisma';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { MemoryPreferenceService } from '../services/memory-preference.service';
import {
  type UpsertMemoryPreferenceDto,
  upsertMemoryPreferenceSchema,
} from '../dto/upsert-memory-preference.dto';

@Controller('memory-preferences')
export class MemoryPreferencesController {
  constructor(private readonly service: MemoryPreferenceService) {}

  @Get()
  async getMine(@CurrentUser() user: AuthenticatedUser): Promise<MemoryPreference> {
    return this.service.get(user.id);
  }

  @Put()
  async upsertMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(upsertMemoryPreferenceSchema))
    dto: UpsertMemoryPreferenceDto,
  ): Promise<MemoryPreference> {
    return this.service.upsert(user.id, dto);
  }
}
