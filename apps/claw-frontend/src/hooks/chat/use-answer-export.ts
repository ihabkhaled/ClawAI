import { useCallback, useState } from 'react';

import {
  ANSWER_EXPORT_MAX_POLLS,
  ANSWER_EXPORT_POLL_MS,
} from '@/constants/answer-export.constants';
import { FileGenerationStatus } from '@/enums';
import type { AnswerExportFormat } from '@/enums/answer-export-format.enum';
import { useFileDownload } from '@/hooks/chat/use-file-download';
import { fileGenerationRepository } from '@/repositories/file-generation/file-generation.repository';
import type { AnswerExportOption, UseAnswerExportResult } from '@/types/answer-export.types';
import {
  answerTitle,
  markdownToPlainText,
  safeFileBase,
  saveTextFile,
} from '@/utilities/answer-export.utility';
import { latestFileAsset } from '@/utilities/file-asset.utility';

/**
 * "Download as" for one AI answer. Markdown and text are built here; HTML,
 * Word and PDF are converted by the file service and fetched through the
 * owner-only link, polled for at most 30 s.
 */
export function useAnswerExport(content: string): UseAnswerExportResult {
  const [pendingFormat, setPendingFormat] = useState<AnswerExportFormat | null>(null);
  const [failed, setFailed] = useState(false);
  const downloader = useFileDownload();

  const exportAs = useCallback(
    (option: AnswerExportOption): void => {
      const title = answerTitle(content);
      const filename = `${safeFileBase(title)}.${option.extension}`;
      setFailed(false);
      if (option.inBrowser) {
        const text = option.extension === 'txt' ? markdownToPlainText(content) : content;
        saveTextFile(
          filename,
          text,
          option.extension === 'txt' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8',
        );
        return;
      }
      setPendingFormat(option.format);
      void (async (): Promise<void> => {
        try {
          const { generationId } = await fileGenerationRepository.exportAnswer(
            content,
            option.format,
            title,
          );
          for (let poll = 0; poll < ANSWER_EXPORT_MAX_POLLS; poll += 1) {
            const generation = await fileGenerationRepository.getById(generationId);
            const asset = latestFileAsset(generation.assets);
            if (generation.status === FileGenerationStatus.COMPLETED && asset !== undefined) {
              await downloader.download(asset.downloadUrl, filename);
              return;
            }
            if (generation.status === FileGenerationStatus.FAILED) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, ANSWER_EXPORT_POLL_MS));
          }
          setFailed(true);
        } catch {
          setFailed(true);
        } finally {
          setPendingFormat(null);
        }
      })();
    },
    [content, downloader],
  );

  return { exportAs, pendingFormat, failed: failed || downloader.failed };
}
