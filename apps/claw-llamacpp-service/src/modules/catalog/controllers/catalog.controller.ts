import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { CatalogService } from '../services/catalog.service';
import { type CatalogQueryDto, CatalogQuerySchema } from '../dto/catalog-query.dto';
import { type CatalogEntry, type CatalogListResult } from '../types/catalog.types';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(CatalogQuerySchema)) query: CatalogQueryDto,
  ): Promise<CatalogListResult> {
    return this.catalogService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CatalogEntry> {
    return this.catalogService.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('refresh')
  @HttpCode(HttpStatus.ACCEPTED)
  refresh(@Body() _body: unknown): Promise<{ refreshed: number; failed: number }> {
    return this.catalogService.refresh();
  }
}
