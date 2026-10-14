import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThreadReaderBody } from '../thread-reader-body';

describe('ThreadReaderBody', () => {
  it('does not show unresolved hex source markers as raw text', () => {
    const { container } = render(
      <ThreadReaderBody
        markdown="مقال [2f25f199712eec3d] نص [[b9e5088333f64bee], [2f25f199712eec3d]] آخر"
        citations={[]}
        truncatedLabel=""
        citationsLabel="Sources"
      />,
    );
    expect(container.textContent).not.toMatch(/[0-9a-f]{16}/u);
    expect(container.textContent).toContain('مقال');
  });

  it('keeps numbered citations and lists the safe sources', () => {
    const { container } = render(
      <ThreadReaderBody
        markdown="Fact [1] and [2f25f199712eec3d]."
        citations={[{ url: 'https://example.com/a' }, { url: 'javascript:alert(1)' }]}
        truncatedLabel=""
        citationsLabel="Sources"
      />,
    );
    expect(container.textContent).toContain('Fact [1] and');
    expect(container.textContent).not.toContain('2f25f199712eec3d');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});
