import { useToggle } from '@/hooks/common/use-toggle';
import { useArchiveEntries } from '@/hooks/files/use-archive-entries';
import { useArchivePasswordPrompt } from '@/hooks/files/use-archive-password-prompt';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { UseMessageAttachmentItemReturn } from '@/types/archive.types';
import { getArchiveRejection } from '@/utilities/archive-status.utility';

/**
 * Controller for one attachment under a sent message: an archive renders as a
 * card with its contents tree, anything else as the usual thumbnail. The
 * listing is cached, so a thread re-render does not ask again.
 */
export function useMessageAttachmentItem(fileId: string): UseMessageAttachmentItemReturn {
  const { t } = useTranslation();
  const { isOpen, toggle } = useToggle(false);
  const { listing, isLoading } = useArchiveEntries(fileId, true);
  const passwordPrompt = useArchivePasswordPrompt(fileId);
  const isArchive = listing?.isArchive === true;

  return {
    t,
    listing: isArchive ? listing : undefined,
    isResolving: isLoading,
    rejection: isArchive
      ? getArchiveRejection(listing.extractionError, listing.ingestionStatus)
      : null,
    isExpanded: isOpen,
    toggleExpanded: toggle,
    passwordPrompt,
  };
}
