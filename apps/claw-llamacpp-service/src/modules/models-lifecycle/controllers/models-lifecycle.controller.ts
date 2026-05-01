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
  Query,
  Res,
  UsePipes,
} from '@nestjs/common';
import { type Response } from 'express';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import {
  type DeleteWeightsDto,
  UpdateRuntimeConfigSchema,
  type UpdateRuntimeConfigDto,
} from '../dto/runtime-config.dto';
import { ModelsLifecycleService } from '../services/models-lifecycle.service';
import { type LoadedModelSnapshot, type RuntimeConfig } from '../types/process.types';

@Controller('models')
export class ModelsLifecycleController {
  constructor(private readonly lifecycle: ModelsLifecycleService) {}

  @Post(':id/load')
  @HttpCode(HttpStatus.OK)
  load(@Param('id') id: string): Promise<LoadedModelSnapshot> {
    return this.lifecycle.load(id);
  }

  @Post(':id/unload')
  @HttpCode(HttpStatus.OK)
  async unload(@Param('id') _id: string, @Res() res: Response): Promise<void> {
    await this.lifecycle.unload();
    res.status(HttpStatus.OK).json({ unloaded: true });
  }

  @Get('loaded')
  async getLoaded(@Res() res: Response): Promise<void> {
    const loaded = await this.lifecycle.getLoaded();
    if (!loaded) {
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }
    res.status(HttpStatus.OK).json(loaded);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Put(':id/config')
  @UsePipes(new ZodValidationPipe(UpdateRuntimeConfigSchema))
  updateConfig(
    @Param('id') id: string,
    @Body() body: UpdateRuntimeConfigDto,
  ): Promise<RuntimeConfig> {
    return this.lifecycle.updateConfig(id, body);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/weights')
  deleteWeights(
    @Param('id') id: string,
    @Body() body: DeleteWeightsDto | undefined,
    @Query('confirmName') queryConfirmName: string | undefined,
  ): Promise<{ deleted: boolean }> {
    const confirmName = (body?.confirmName ?? queryConfirmName ?? '').trim();
    return this.lifecycle.deleteWeights(id, confirmName);
  }
}
