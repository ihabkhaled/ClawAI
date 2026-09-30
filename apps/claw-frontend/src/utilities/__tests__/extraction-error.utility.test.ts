import { VideoProcessingFailureReason } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { EXTRACTION_ERROR_KEY_BY_VIDEO_REASON } from '@/constants/extraction-error.constants';
import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import { MEDIA_UI_TRANSLATIONS } from '@/lib/i18n/locales/media-ui-translations';
import type { ComposerAttachmentFileStatus } from '@/types/composer-attachment.types';
import { extractionErrorDetailKey } from '@/utilities/extraction-error.utility';

function failed(overrides: Partial<ComposerAttachmentFileStatus>): ComposerAttachmentFileStatus {
  return {
    id: 'f1',
    filename: 'clip.mp4',
    ingestionStatus: FileIngestionStatus.FAILED,
    extractionError: 'Some backend English sentence',
    ...overrides,
  };
}

describe('extractionErrorDetailKey', () => {
  it('maps a video failure reason code to its own key', () => {
    expect(
      extractionErrorDetailKey(
        failed({
          extractionMetadata: {
            media: { failureReason: VideoProcessingFailureReason.DURATION_TOO_LONG },
          },
        }),
      ),
    ).toBe('mediaUi.attachmentState.failureDetail.durationTooLong');
  });

  it('maps an archive code prefix to the archive rejection key', () => {
    expect(
      extractionErrorDetailKey(failed({ extractionError: 'ZIP_PATH_TRAVERSAL: ../etc/passwd' })),
    ).toBe('files.archive.rejected.traversal');
  });

  it('falls back to the generic key for an unknown or missing code', () => {
    expect(extractionErrorDetailKey(failed({}))).toBe(
      'mediaUi.attachmentState.failureDetail.generic',
    );
    expect(extractionErrorDetailKey(failed({ extractionError: null }))).toBe(
      'mediaUi.attachmentState.failureDetail.generic',
    );
  });

  it('every mapped key resolves to a real, non-English-placeholder string in all 13 locales', () => {
    const keys = [
      ...EXTRACTION_ERROR_KEY_BY_VIDEO_REASON.values(),
      'mediaUi.attachmentState.failureDetail.generic',
    ];
    const english = MEDIA_UI_TRANSLATIONS.en.attachmentState.failureDetail;
    for (const [locale, dictionary] of Object.entries(MEDIA_UI_TRANSLATIONS)) {
      const details: Record<string, string> = dictionary.attachmentState.failureDetail;
      for (const key of keys) {
        const leaf = key.split('.').at(-1) ?? '';
        expect(details[leaf], `${locale}.${leaf}`).toBeTruthy();
        if (locale !== 'en') {
          expect(details[leaf], `${locale}.${leaf} is English`).not.toBe(
            (english as Record<string, string>)[leaf],
          );
        }
      }
    }
  });
});
