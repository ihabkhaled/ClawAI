import { Archive, FileCode, FileSpreadsheet, FileText, Presentation } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { getFileTypeDescriptor } from '@/utilities/file-type-icon.utility';

describe('getFileTypeDescriptor', () => {
  // Every Office MIME type contains "xml" (…openxmlformats…), and Word and
  // PowerPoint files used to fall into the code branch.
  it.each([
    [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'deck.pptx',
      Presentation,
    ],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'plan.docx',
      FileText,
    ],
    [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'data.xlsx',
      FileSpreadsheet,
    ],
    ['application/zip', 'bundle.zip', Archive],
    ['application/json', 'data.json', FileCode],
    ['application/pdf', 'report.pdf', FileText],
  ])('%s → the right icon', (mime, name, icon) => {
    expect(getFileTypeDescriptor(mime, name).Icon).toBe(icon);
  });
});
