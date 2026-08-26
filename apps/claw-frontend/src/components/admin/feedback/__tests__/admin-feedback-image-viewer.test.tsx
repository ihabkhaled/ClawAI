import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AdminFeedbackImageViewer } from '@/components/admin/feedback/admin-feedback-image-viewer';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined
        ? key
        : `${key}:${Object.values(params)
            .map((value) => String(value))
            .join('x')}`,
  }),
}));

function renderViewer(alt = 'screenshot.png'): void {
  render(<AdminFeedbackImageViewer src="blob:screenshot" alt={alt} open onOpenChange={vi.fn()} />);
}

function loadImageWith(naturalWidth: number, naturalHeight: number): HTMLImageElement {
  const image = screen.getByAltText('screenshot.png');
  Object.defineProperty(image, 'naturalWidth', { value: naturalWidth, configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: naturalHeight, configurable: true });
  fireEvent.load(image);
  return image as HTMLImageElement;
}

describe('AdminFeedbackImageViewer', () => {
  // The viewer drew its own X on a transparent panel while DialogContent
  // already renders one, so two close glyphs floated over the backdrop with no
  // frame under them.
  it('offers exactly one close control', () => {
    renderViewer();

    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });

  it('names the attachment in the dialog title and the image alt text', () => {
    renderViewer();

    expect(screen.getByRole('dialog', { name: 'screenshot.png' })).toBeInTheDocument();
    expect(screen.getByAltText('screenshot.png')).toHaveAttribute('src', 'blob:screenshot');
  });

  it('falls back to the translated preview label when the filename is empty', () => {
    render(<AdminFeedbackImageViewer src="blob:screenshot" alt="" open onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole('dialog', { name: 'feedback.admin.detail.imagePreview' }),
    ).toBeInTheDocument();
  });

  it('reports the decoded dimensions once the image loads', () => {
    renderViewer();
    loadImageWith(1280, 720);

    expect(screen.getByText('feedback.admin.detail.imageDimensions:1280x720')).toBeInTheDocument();
  });

  // A one-pixel attachment rendered at its natural size is indistinguishable
  // from a broken viewer: an empty panel with nothing in it.
  it('scales an image too small to see instead of showing an empty panel', () => {
    renderViewer();
    const image = loadImageWith(1, 1);

    expect(image.className).toContain('image-preview-pixelated');
    expect(image.className).toContain('size-64');
  });

  it('leaves a normal image at its own size', () => {
    renderViewer();
    const image = loadImageWith(800, 600);

    expect(image.className).not.toContain('image-preview-pixelated');
  });

  // An expired blob URL used to render as a blank void with no hint that
  // anything had gone wrong.
  it('says so when the file cannot be decoded', () => {
    renderViewer();
    fireEvent.error(screen.getByAltText('screenshot.png'));

    expect(screen.getByText('feedback.admin.detail.imageUnavailable')).toBeInTheDocument();
    expect(screen.queryByAltText('screenshot.png')).not.toBeInTheDocument();
  });

  it('links to the original file', () => {
    renderViewer();

    expect(
      screen.getByRole('link', { name: 'feedback.admin.detail.openOriginal' }),
    ).toHaveAttribute('href', 'blob:screenshot');
  });

  it('closes through the single close control', async () => {
    const onOpenChange = vi.fn();
    render(
      <AdminFeedbackImageViewer
        src="blob:screenshot"
        alt="screenshot.png"
        open
        onOpenChange={onOpenChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
