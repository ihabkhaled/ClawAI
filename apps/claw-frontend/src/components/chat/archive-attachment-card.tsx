import { Archive, ChevronDown, ChevronRight, Lock } from 'lucide-react';

import { ArchiveEntryTree } from '@/components/files/archive/archive-entry-tree';
import { ArchivePasswordDialog } from '@/components/files/archive/archive-password-dialog';
import { ArchiveRejectionNotice } from '@/components/files/archive/archive-rejection-notice';
import { Button } from '@/components/ui/button';
import { ArchiveRejectionReason } from '@/enums/archive-rejection-reason.enum';
import type { ArchiveAttachmentCardProps } from '@/types/archive.types';
import { getArchiveListingCount } from '@/utilities/archive-status.utility';

// An archive attached to a sent message: its name, how many files it held, why
// it was refused if it was, and its tree on demand. Full width on a phone,
// a fixed card beside other attachments from `sm` up.
export function ArchiveAttachmentCard({
  listing,
  rejection,
  isExpanded,
  onToggle,
  passwordPrompt,
  t,
}: ArchiveAttachmentCardProps): React.ReactElement {
  const count = getArchiveListingCount(listing);
  const isUnlockable =
    rejection !== null &&
    (rejection.reason === ArchiveRejectionReason.Encrypted ||
      rejection.reason === ArchiveRejectionReason.PartlyEncrypted);

  return (
    <div
      className="bg-card w-full min-w-0 rounded-lg border p-2 sm:w-80"
      data-testid="archive-attachment-card"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Archive className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={listing.filename}>
          {listing.filename}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {t('files.archive.fileCount', { count })}
        </span>
      </div>
      {rejection === null ? null : (
        <ArchiveRejectionNotice rejection={rejection} t={t} className="mt-2 p-2 text-xs" />
      )}
      {isUnlockable ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={passwordPrompt.open}
          className="touch:min-h-11 mt-2 h-8 gap-1 px-2 text-xs"
          data-testid="archive-unlock-trigger"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t('files.archive.password.unlockButton')}
        </Button>
      ) : null}
      {isUnlockable ? (
        <ArchivePasswordDialog
          open={passwordPrompt.isOpen}
          status={passwordPrompt.status}
          password={passwordPrompt.password}
          onPasswordChange={passwordPrompt.setPassword}
          onOpenChange={passwordPrompt.onOpenChange}
          onSubmit={passwordPrompt.submit}
          t={t}
        />
      ) : null}
      {count > 0 ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            onClick={onToggle}
            className="touch:min-h-11 mt-1 h-8 gap-1 px-2 text-xs"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            )}
            {t(isExpanded ? 'files.archive.hideContents' : 'files.archive.showContents')}
          </Button>
          {isExpanded ? (
            <ArchiveEntryTree
              archiveFileId={listing.archiveFileId}
              className="max-h-64 overflow-y-auto"
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
