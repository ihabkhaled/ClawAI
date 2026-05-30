import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttachmentDeliveryChip } from '@/components/chat/attachments/attachment-delivery-chip';
import { FileDeliveryMode } from '@/enums';
import type { FileDeliveryEntry } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>): string => {
      if (params && Object.keys(params).length > 0) {
        const paramStr = Object.entries(params)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(',');
        return `${key}(${paramStr})`;
      }
      return key;
    },
  }),
}));

const delivery: FileDeliveryEntry[] = [
  {
    fileId: 'f-1',
    filename: 'notes.txt',
    mimeType: 'text/plain',
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    mode: FileDeliveryMode.EXTRACTED_TEXT,
  },
  {
    fileId: 'f-2',
    filename: 'spec.md',
    mimeType: 'text/markdown',
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    mode: FileDeliveryMode.EXTRACTED_TEXT,
  },
  {
    fileId: 'f-3',
    filename: 'diagram.png',
    mimeType: 'image/png',
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    mode: FileDeliveryMode.OMITTED_NO_VISION,
    reason: 'model has no vision capability',
  },
];

describe('AttachmentDeliveryChip', () => {
  it('returns null when delivery is empty', () => {
    const { container } = render(<AttachmentDeliveryChip delivery={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one chip per non-zero mode count', () => {
    render(<AttachmentDeliveryChip delivery={delivery} />);
    const root = screen.getByTestId('attachment-delivery-chip');
    expect(root).toBeInTheDocument();
    // Two extracted-text files -> the chip text includes the count `2`.
    expect(root.textContent).toContain('compare.delivery.extractedText 2');
    // One omitted-no-vision file -> the chip text includes the count `1`.
    expect(root.textContent).toContain('compare.delivery.omittedNoVision 1');
    // No image / unsupported / truncated chips should render.
    expect(root.textContent).not.toContain('compare.delivery.nativeImage');
    expect(root.textContent).not.toContain('compare.delivery.omittedUnsupported');
    expect(root.textContent).not.toContain('compare.delivery.truncatedText');
  });

  it('builds a tooltip listing each filename with its mode and reason', () => {
    render(<AttachmentDeliveryChip delivery={delivery} />);
    const root = screen.getByTestId('attachment-delivery-chip');
    const tooltip = root.getAttribute('title') ?? '';
    expect(tooltip).toContain('compare.delivery.tooltip');
    expect(tooltip).toContain('notes.txt');
    expect(tooltip).toContain('spec.md');
    expect(tooltip).toContain('diagram.png');
    // OMITTED_NO_VISION entry carries a reason — it must appear after the em-dash.
    expect(tooltip).toContain('model has no vision capability');
  });

  it('exposes an aria-label so screen readers announce the chip group', () => {
    render(<AttachmentDeliveryChip delivery={delivery} />);
    const root = screen.getByLabelText('compare.delivery.tooltip');
    expect(root).toBeInTheDocument();
  });
});
