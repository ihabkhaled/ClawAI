import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  IMPORT_CACHE_CONTROL,
  PREVIEW_THROTTLE,
  UPLOAD_FIELD,
  UPLOAD_OPTIONS,
} from '../constants/plugin-import.constants';
import {
  type ConfirmBody,
  confirmBodySchema,
  type GithubPreviewBody,
  githubPreviewBodySchema,
  type UploadFields,
  uploadFieldsSchema,
} from '../dto/plugin-import.dto';
import { PluginImportService } from '../services/plugin-import.service';
import {
  type ImportedPluginView,
  type ImportPreviewResponse,
  type UploadedArchive,
} from '../types/plugin-import.types';

/** Import a third-party plugin: preview (nothing stored as a plugin), confirm by checksum, list, remove. */
@Controller('plugins/imports')
export class PluginImportController {
  constructor(private readonly imports: PluginImportService) {}

  @Post('preview/github')
  @HttpCode(200)
  @Throttle(PREVIEW_THROTTLE)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  @Header('Cache-Control', IMPORT_CACHE_CONTROL)
  previewGithub(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(githubPreviewBodySchema)) body: GithubPreviewBody,
  ): Promise<ImportPreviewResponse> {
    return this.imports.previewGithub(user.id, body.source, body.subdir);
  }

  @Post('preview/upload')
  @HttpCode(200)
  @Throttle(PREVIEW_THROTTLE)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  @Header('Cache-Control', IMPORT_CACHE_CONTROL)
  @UseInterceptors(FileInterceptor(UPLOAD_FIELD, UPLOAD_OPTIONS))
  previewUpload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedArchive | undefined,
    @Body(new ZodValidationPipe(uploadFieldsSchema)) fields: UploadFields,
  ): Promise<ImportPreviewResponse> {
    return this.imports.previewUpload(user.id, file, fields.subdir);
  }

  @Post(':draftId/confirm')
  @HttpCode(201)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  @Header('Cache-Control', IMPORT_CACHE_CONTROL)
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('draftId', new ParseUUIDPipe()) draftId: string,
    @Body(new ZodValidationPipe(confirmBodySchema)) body: ConfirmBody,
  ): Promise<ImportedPluginView> {
    return this.imports.confirm(user.id, draftId, body.checksum);
  }

  @Get()
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', IMPORT_CACHE_CONTROL)
  list(@CurrentUser() user: AuthenticatedUser): Promise<ImportedPluginView[]> {
    return this.imports.list(user.id);
  }

  @Get(':id')
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', IMPORT_CACHE_CONTROL)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ImportedPluginView> {
    return this.imports.get(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.imports.remove(user.id, id);
  }
}
