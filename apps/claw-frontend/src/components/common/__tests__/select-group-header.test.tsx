import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SelectGroupHeader } from '@/components/common/select-group-header';
import { Select, SelectContent, SelectGroup } from '@/components/ui/select';

// Radix Select renders its content through a portal and only when open, so the
// heading needs the real open Select around it to mount at all.
function renderHeading(label: string): void {
  render(
    <Select open>
      <SelectContent>
        <SelectGroup>
          <SelectGroupHeader>{label}</SelectGroupHeader>
        </SelectGroup>
      </SelectContent>
    </Select>,
  );
}

describe('SelectGroupHeader', () => {
  it('renders its label', () => {
    renderHeading('Ollama (Local)');
    expect(screen.getByText('Ollama (Local)')).toBeInTheDocument();
  });

  it('carries all three visual signals that separate a heading from an option', () => {
    // Any one alone is easy to miss in a dense list of models, so the test
    // pins all three rather than just asserting "has a class".
    renderHeading('Ollama (Connector)');
    const heading = screen.getByText('Ollama (Connector)');

    expect(heading.className).toContain('bg-muted/60'); // tinted band
    expect(heading.className).toContain('font-bold'); // heavier than options
    expect(heading.className).toContain('text-base'); // 2px larger than text-sm
  });

  it('blocks text selection so a drag cannot make it look chosen', () => {
    // Without this, dragging across the heading paints it with the OS
    // selection highlight — which is visually identical to a selected option.
    renderHeading('Ollama (Local)');
    expect(screen.getByText('Ollama (Local)').className).toContain('select-none');
  });

  it('is not an option, so it can never be picked', () => {
    // The whole point of the restyle. A heading exposed with an option role
    // would be reachable by keyboard and announced as selectable.
    renderHeading('Ollama (Local)');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('accepts extra classes without dropping the base styling', () => {
    render(
      <Select open>
        <SelectContent>
          <SelectGroup>
            <SelectGroupHeader className="mt-4">Grouped</SelectGroupHeader>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    const heading = screen.getByText('Grouped');

    expect(heading.className).toContain('mt-4');
    expect(heading.className).toContain('font-bold');
  });
});
