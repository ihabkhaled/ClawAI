import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttachmentThumbnail } from '@/components/chat/attachment-thumbnail';

const mockUseAuthenticatedImage = vi.fn();

vi.mock('@/hooks/chat/use-authenticated-image', () => ({
  useAuthenticatedImage: (...args: unknown[]) => mockUseAuthenticatedImage(...args),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

describe('AttachmentThumbnail (image category)', () => {
  it('shows a real image thumbnail once the authenticated blob resolves', () => {
    mockUseAuthenticatedImage.mockReturnValue('blob:mock-photo');

    render(<AttachmentThumbnail fileId="f1" />);

    const img = screen.getByRole('img', { name: 'chat.attachedFile' });
    expect(img).toHaveAttribute('src', 'blob:mock-photo');
    expect(img).toHaveClass('object-cover');
  });

  it('wraps the thumbnail in a link that opens the full image in a new tab', () => {
    mockUseAuthenticatedImage.mockReturnValue('blob:mock-photo');

    render(<AttachmentThumbnail fileId="f1" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'blob:mock-photo');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a plain placeholder — not a broken image icon — while the blob has not resolved yet', () => {
    mockUseAuthenticatedImage.mockReturnValue(null);

    render(<AttachmentThumbnail fileId="f1" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
