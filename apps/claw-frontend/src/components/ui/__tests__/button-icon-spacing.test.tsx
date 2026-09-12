import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

// A button is a flex row, and a flex row has no spacing of its own. Every
// icon+label button that did not ask for a gap rendered the icon welded to the
// first letter — a defect invisible to every test that asserts on text, and
// only ever caught in a screenshot. The gap now lives in the base variant, and
// this suite is what stops it being removed or overridden by accident.
describe('Button icon/label spacing', () => {
  it('separates an icon from its label by default', () => {
    render(
      <Button>
        <svg data-testid="icon" />
        Send again
      </Button>,
    );
    expect(screen.getByRole('button').className).toContain('gap-2');
  });

  it('keeps the gap for every variant and size', () => {
    const { rerender } = render(<Button variant="outline">Label</Button>);
    expect(screen.getByRole('button').className).toContain('gap-2');

    rerender(
      <Button variant="ghost" size="sm">
        Label
      </Button>,
    );
    expect(screen.getByRole('button').className).toContain('gap-2');
  });

  it('keeps the gap when rendering as a child element', () => {
    render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    expect(screen.getByRole('link').className).toContain('gap-2');
  });

  // The base sets a default, not a law: a call site with a real reason for a
  // different gap must still win, or people go back to fighting it with
  // wrappers and margins.
  it('lets a call site override the spacing', () => {
    render(<Button className="gap-4">Label</Button>);
    const className = screen.getByRole('button').className;
    expect(className).toContain('gap-4');
    expect(className).not.toContain('gap-2');
  });
});
