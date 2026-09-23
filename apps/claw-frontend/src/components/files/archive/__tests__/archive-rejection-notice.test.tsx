import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ArchiveRejectionNotice } from '@/components/files/archive/archive-rejection-notice';
import { ArchiveRejectionReason } from '@/enums/archive-rejection-reason.enum';

const t = (key: string): string => key;

describe('ArchiveRejectionNotice', () => {
  it('renders an error role for a fatal rejection (nothing was delivered)', () => {
    render(
      <ArchiveRejectionNotice
        rejection={{ reason: ArchiveRejectionReason.Bomb, isFatal: true, code: 'ZIP_BOMB_RATIO' }}
        t={t}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('files.archive.rejected.bomb');
  });

  it('renders a warning title, not the fatal title, for a partial skip', () => {
    render(
      <ArchiveRejectionNotice
        rejection={{
          reason: ArchiveRejectionReason.PartlyEncrypted,
          isFatal: false,
          code: 'ARCHIVE_ENCRYPTED',
        }}
        t={t}
      />,
    );
    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent('files.archive.rejected.warningTitle');
    expect(notice).toHaveTextContent('files.archive.rejected.partlyEncrypted');
    expect(notice).not.toHaveTextContent('files.archive.rejected.title');
  });
});
