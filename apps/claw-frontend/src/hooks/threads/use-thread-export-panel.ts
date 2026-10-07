import { useState } from 'react';

import { THREAD_ZIP_MIME } from '@/constants/thread-publication.constants';
import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import type {
  ThreadExportPanelController,
  ThreadExportPanelHookInput,
} from '@/types/thread-export.types';
import { saveThreadFile } from '@/utilities/thread-file-download.utility';
import { createZipBytes } from '@/utilities/zip-store.utility';

/**
 * Which formats are ticked, and what the Download button does: one format is saved as itself,
 * several are saved together as one ZIP so the browser asks for a single download, not five.
 */
export function useThreadExportPanel({
  baseName,
  buildFile,
}: ThreadExportPanelHookInput): ThreadExportPanelController {
  const [selected, setSelected] = useState<ReadonlySet<ThreadPublicationExportFormat>>(
    new Set([ThreadPublicationExportFormat.Markdown]),
  );
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  function toggle(format: ThreadPublicationExportFormat): void {
    const next = new Set(selected);
    if (next.has(format)) {
      next.delete(format);
    } else {
      next.add(format);
    }
    setSelected(next);
  }

  async function download(): Promise<void> {
    setIsBusy(true);
    setHasFailed(false);
    try {
      const files = await Promise.all([...selected].map((format) => buildFile(format)));
      const [only] = files;
      if (files.length === 1 && only !== undefined) {
        saveThreadFile(only.name, only.mime, only.content);
      } else if (files.length > 1) {
        const encoder = new TextEncoder();
        const zip = createZipBytes(
          files.map((file) => ({ name: file.name, data: encoder.encode(file.content) })),
        );
        saveThreadFile(`${baseName}.zip`, THREAD_ZIP_MIME, zip);
      }
    } catch {
      setHasFailed(true);
    } finally {
      setIsBusy(false);
    }
  }

  function savePdf(): void {
    window.print();
  }

  return {
    selected,
    isBusy,
    hasFailed,
    canDownload: selected.size > 0 && !isBusy,
    toggle,
    download,
    savePdf,
  };
}
