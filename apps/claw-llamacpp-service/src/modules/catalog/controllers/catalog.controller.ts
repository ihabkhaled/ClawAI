import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { CatalogService } from '../services/catalog.service';
import { type CatalogQueryDto, CatalogQuerySchema } from '../dto/catalog-query.dto';
import {
  type HfAddRequestDto,
  HfAddRequestSchema,
  type HfSearchQueryDto,
  HfSearchQuerySchema,
} from '../dto/hf-search.dto';
import { type CatalogEntry, type CatalogListResult } from '../types/catalog.types';
import { type HfAutoSyncReport } from '../types/hf-auto-sync.types';
import { type HfModelDetails, type HfModelSummary } from '../types/hf-search.types';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(CatalogQuerySchema)) query: CatalogQueryDto,
  ): Promise<CatalogListResult> {
    return this.catalogService.list(query);
  }

  @Get('hf-search')
  searchHf(
    @Query(new ZodValidationPipe(HfSearchQuerySchema)) query: HfSearchQueryDto,
  ): Promise<HfModelSummary[]> {
    return this.catalogService.searchHuggingFace(query);
  }

  @Get('hf-models/:author/:name')
  getHfDetails(
    @Param('author') author: string,
    @Param('name') name: string,
  ): Promise<HfModelDetails> {
    return this.catalogService.getHuggingFaceDetails(`${author}/${name}`);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Post('hf-import')
  @HttpCode(HttpStatus.CREATED)
  importFromHf(
    @Body(new ZodValidationPipe(HfAddRequestSchema)) body: HfAddRequestDto,
  ): Promise<CatalogEntry> {
    return this.catalogService.addFromHuggingFace(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CatalogEntry> {
    return this.catalogService.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Post('refresh')
  @HttpCode(HttpStatus.ACCEPTED)
  refresh(@Body() _body: unknown): Promise<{ refreshed: number; failed: number }> {
    return this.catalogService.refresh();
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Post('hf-auto-sync')
  @HttpCode(HttpStatus.ACCEPTED)
  triggerHfAutoSync(@Body() _body: unknown): Promise<HfAutoSyncReport> {
    return this.catalogService.triggerHfAutoSync();
  }
}
