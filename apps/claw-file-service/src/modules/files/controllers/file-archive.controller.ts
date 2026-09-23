import { Controller, Get, Param } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ArchiveEntriesService } from '../services/archive-entries.service';
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
}
