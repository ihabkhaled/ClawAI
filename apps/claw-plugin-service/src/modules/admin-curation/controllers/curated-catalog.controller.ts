import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import {
  type AuthenticatedUser,
  type CuratedEntryView,
  type CuratedPreviewView,
  Permission,
} from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { catalogSlugSchema } from '../../catalog/dto/catalog-query.dto';
import { ADMIN_CACHE_CONTROL, ADMIN_OUTBOUND_THROTTLE } from '../constants/curation.constants';
import {
  type CreateCuratedBody,
  createCuratedBodySchema,
  type CuratedStateBody,
  curatedStateBodySchema,
  type ListCuratedQuery,
  listCuratedQuerySchema,
  type PreviewCuratedBody,
  previewCuratedBodySchema,
  type UpdateCuratedBody,
  updateCuratedBodySchema,
} from '../dto/curation.dto';
import { CuratedCatalogService } from '../services/curated-catalog.service';

/** Admin curation of the curated remote-MCP catalog entries (PLUGINS_ADMIN). */
@RequirePermissions(Permission.PLUGINS_ADMIN)
@Controller('plugins/admin/curated')
export class CuratedCatalogController {
  constructor(private readonly catalog: CuratedCatalogService) {}

  @Get()
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  list(
    @Query(new ZodValidationPipe(listCuratedQuerySchema)) query: ListCuratedQuery,
  ): Promise<CuratedEntryView[]> {
    return this.catalog.list(query.includeDeleted);
  }

  @Post('preview')
  @HttpCode(200)
  @Throttle({ default: ADMIN_OUTBOUND_THROTTLE })
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  preview(
    @Body(new ZodValidationPipe(previewCuratedBodySchema)) body: PreviewCuratedBody,
  ): Promise<CuratedPreviewView> {
    return this.catalog.preview(body);
  }

  @Get(':slug')
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  get(
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
  ): Promise<CuratedEntryView> {
    return this.catalog.get(slug);
  }

  @Post()
  @Throttle({ default: ADMIN_OUTBOUND_THROTTLE })
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCuratedBodySchema)) body: CreateCuratedBody,
  ): Promise<CuratedEntryView> {
    return this.catalog.create(user.id, body);
  }

  @Put(':slug')
  @Throttle({ default: ADMIN_OUTBOUND_THROTTLE })
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
    @Body(new ZodValidationPipe(updateCuratedBodySchema)) body: UpdateCuratedBody,
  ): Promise<CuratedEntryView> {
    return this.catalog.update(user.id, slug, body);
  }

  @Patch(':slug/state')
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  setState(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
    @Body(new ZodValidationPipe(curatedStateBodySchema)) body: CuratedStateBody,
  ): Promise<CuratedEntryView> {
    return this.catalog.setEnabled(user.id, slug, body.enabled);
  }

  @Post(':slug/health-check')
  @HttpCode(200)
  @Throttle({ default: ADMIN_OUTBOUND_THROTTLE })
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  checkHealth(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
  ): Promise<CuratedEntryView> {
    return this.catalog.checkHealth(user.id, slug);
  }

  @Delete(':slug')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
  ): Promise<void> {
    await this.catalog.remove(user.id, slug);
  }
}
