import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import { ArchiveEntriesService } from '../services/archive-entries.service';
import { type ArchivePasswordDto, archivePasswordSchema } from '../dto/archive-password.dto';
import { type ArchiveEntryListing } from '../types/archive-entries.types';

// Same gate as FilesController: every user-facing file route needs FILES_USE.
// A separate controller so the archive listing does not widen FilesController's
// constructor. `:id/archive-entries` has two segments, so it never collides
// with FilesController's `:id`.
@Controller('files')
@RequirePermissions(Permission.FILES_USE)
export class FileArchiveController {
  constructor(private readonly archiveEntriesService: ArchiveEntriesService) {}

  @Get(':id/archive-entries')
  async getArchiveEntries(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ArchiveEntryListing> {
    return this.archiveEntriesService.getArchiveEntries(id, user.id);
  }

  // Batch A3 — the in-chat password prompt for an ARCHIVE_ENCRYPTED file.
  // Bounded by ARCHIVE_PASSWORD_MAX_ATTEMPTS in the service; the password
  // itself never appears in this controller's logs (Nest's request logger
  // here logs method + path only, never the body — see rules/19).
  @Post(':id/archive-password')
  async submitPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(archivePasswordSchema)) dto: ArchivePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ArchiveEntryListing> {
    return this.archiveEntriesService.submitPassword(id, user.id, dto.password);
  }
}
