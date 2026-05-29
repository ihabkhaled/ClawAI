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
} from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Roles } from '../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../common/enums/user-role.enum';
import type {
  DiscoverySource,
  ModelCatalogEntry,
  ModelDiscoveryCandidate,
  ModelDiscoveryRun,
} from '../../generated/prisma';
import {
  type ApproveCandidateDto,
  approveCandidateSchema,
  type BulkApproveDto,
  bulkApproveSchema,
  type RejectCandidateDto,
  rejectCandidateSchema,
} from './dto/approve-candidate.dto';
import {
  type CreateCatalogEntryDto,
  createCatalogEntrySchema,
  type UpdateCatalogEntryDto,
  updateCatalogEntrySchema,
} from './dto/catalog-admin.dto';
import {
  type CreateDiscoverySourceDto,
  createDiscoverySourceSchema,
  type UpdateDiscoverySourceDto,
  updateDiscoverySourceSchema,
} from './dto/discovery-source.dto';
import { type DiscoveryTriggerDto, discoveryTriggerSchema } from './dto/discovery-trigger.dto';
import {
  type ListCandidatesQueryDto,
  listCandidatesQuerySchema,
  type ListRunsQueryDto,
  listRunsQuerySchema,
} from './dto/list-candidates-query.dto';
import { CatalogClassificationService } from './services/catalog-classification.service';
import { CatalogSyncService } from './services/catalog-sync.service';
import { DiscoveryJobService } from './services/discovery-job.service';
import { DiscoverySourceService } from './services/discovery-source.service';
import { HardwarePackService } from './services/hardware-pack.service';
import type {
  DiscoveryTriggerResult,
  HardwarePackInfo,
  InstallPackResult,
  PaginatedCandidates,
  PaginatedRuns,
} from './types/discovery.types';
import type { SearchBrowserReclassifySummary } from './types/search-browser-reclassify.types';

@Controller('ollama')
export class OllamaDiscoveryController {
  constructor(
    private readonly sourceService: DiscoverySourceService,
    private readonly jobService: DiscoveryJobService,
    private readonly catalogSync: CatalogSyncService,
    private readonly hardwarePackService: HardwarePackService,
    private readonly catalogClassification: CatalogClassificationService,
  ) {}

  @Post('catalog/reclassify')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  reclassifySearchBrowser(): Promise<SearchBrowserReclassifySummary> {
    return this.catalogClassification.reclassifySearchBrowser();
  }

  @Get('discovery/sources')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  listSources(): Promise<DiscoverySource[]> {
    return this.sourceService.list();
  }

  @Post('discovery/sources')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  createSource(
    @Body(new ZodValidationPipe(createDiscoverySourceSchema)) dto: CreateDiscoverySourceDto,
  ): Promise<DiscoverySource> {
    return this.sourceService.create(dto);
  }

  @Put('discovery/sources/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  updateSource(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDiscoverySourceSchema)) dto: UpdateDiscoverySourceDto,
  ): Promise<DiscoverySource> {
    return this.sourceService.update(id, dto);
  }

  @Delete('discovery/sources/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSource(@Param('id') id: string): Promise<void> {
    await this.sourceService.delete(id);
  }

  @Post('discovery/refresh')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @HttpCode(HttpStatus.ACCEPTED)
  triggerRefresh(
    @Body(new ZodValidationPipe(discoveryTriggerSchema)) dto: DiscoveryTriggerDto,
  ): Promise<DiscoveryTriggerResult> {
    return this.jobService.triggerRefresh({
      sourceId: dto.sourceId,
      isDryRun: dto.isDryRun,
      triggeredBy: 'admin',
    });
  }

  @Get('discovery/runs')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  listRuns(
    @Query(new ZodValidationPipe(listRunsQuerySchema)) query: ListRunsQueryDto,
  ): Promise<PaginatedRuns> {
    return this.jobService.listRuns(query);
  }

  @Get('discovery/runs/:id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  getRun(@Param('id') id: string): Promise<ModelDiscoveryRun> {
    return this.jobService.getRun(id);
  }

  @Get('discovery/candidates')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  listCandidates(
    @Query(new ZodValidationPipe(listCandidatesQuerySchema)) query: ListCandidatesQueryDto,
  ): Promise<PaginatedCandidates> {
    return this.jobService.listCandidates(query);
  }

  @Post('discovery/candidates/:id/approve')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  approveCandidate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(approveCandidateSchema)) dto: ApproveCandidateDto,
  ): Promise<ModelDiscoveryCandidate> {
    return this.jobService.approveCandidate({ candidateId: id, overrides: dto.overrides });
  }

  @Post('discovery/candidates/:id/reject')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  rejectCandidate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectCandidateSchema)) dto: RejectCandidateDto,
  ): Promise<ModelDiscoveryCandidate> {
    return this.jobService.rejectCandidate(id, dto.reason);
  }

  @Post('discovery/candidates/bulk-approve')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  bulkApprove(
    @Body(new ZodValidationPipe(bulkApproveSchema)) dto: BulkApproveDto,
  ): Promise<{ approved: number; duplicates: number; failed: number }> {
    return this.jobService.bulkApprove(dto);
  }

  @Post('catalog/admin')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  createCatalogEntry(
    @Body(new ZodValidationPipe(createCatalogEntrySchema)) dto: CreateCatalogEntryDto,
  ): Promise<ModelCatalogEntry> {
    return this.catalogSync.createEntry(dto);
  }

  @Put('catalog/admin/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  updateCatalogEntry(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCatalogEntrySchema)) dto: UpdateCatalogEntryDto,
  ): Promise<ModelCatalogEntry> {
    return this.catalogSync.updateEntry(id, dto);
  }

  @Delete('catalog/admin/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCatalogEntry(@Param('id') id: string): Promise<void> {
    await this.catalogSync.deleteEntry(id);
  }

  @Get('packs')
  listHardwarePacks(): Promise<HardwarePackInfo[]> {
    return this.hardwarePackService.listPacks();
  }

  @Post('packs/:profile/install')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  installPack(@Param('profile') profile: string): Promise<InstallPackResult> {
    return this.hardwarePackService.installPack({ profile });
  }
}
