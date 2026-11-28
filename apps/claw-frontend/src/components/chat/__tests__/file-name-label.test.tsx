import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FileNameLabel } from '@/components/chat/file-name-label';

describe('FileNameLabel', () => {
  it('keeps a long name on one clipped line on touch screens too, with the full name on hover', () => {
    const name = 'ClawAI_NVIDIA_Investigative_Research_Prompt.txt';
    render(<FileNameLabel filename={name} />);
    const label = screen.getByText(name);
    expect(label).toHaveAttribute('title', name);
    expect(label.className).toContain('truncate-fixed');
    // `truncate` alone wraps anywhere on touch (globals.css); it must never be the clipping class here.
    expect(label.className).not.toMatch(/(^|\s)truncate(\s|$)/u);
  });
});
