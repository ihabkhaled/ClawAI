import { Alert } from '@/components/ui/alert';
import { ARCHIVE_REJECTION_MESSAGE_KEYS } from '@/constants/archive.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { ArchiveRejectionNoticeProps } from '@/types/archive.types';

// Why an archive was refused (bomb, traversal, encrypted, ...), or — for a
// partial skip — why some of it is missing. The shared Alert gives it the
// right live-region role and an icon next to the words.
export function ArchiveRejectionNotice({
  rejection,
  t,
  className,
}: ArchiveRejectionNoticeProps): React.ReactElement {
  return (
    <Alert
      variant={rejection.isFatal ? AlertVariant.Error : AlertVariant.Warning}
      title={t(
        rejection.isFatal ? 'files.archive.rejected.title' : 'files.archive.rejected.warningTitle',
      )}
      description={t(ARCHIVE_REJECTION_MESSAGE_KEYS[rejection.reason])}
      className={className}
    />
  );
}
