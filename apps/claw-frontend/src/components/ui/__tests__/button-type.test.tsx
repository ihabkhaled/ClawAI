import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';

/**
 * A button is not a submit button unless it says so.
 *
 * HTML defaults a bare `<button>` to `type="submit"`. Most buttons in this app
 * are not submit buttons, so inheriting the spec default turns "someone wrapped
 * a region in a form" into "every button in it now submits" — a bug that
 * appears later, in a different file, with no edit to the button itself. Two
 * live examples were already sitting one refactor away from breaking: the
 * research transcript panel and the research run details both omit `type` and
 * are only safe because the message list happens to be a SIBLING of the
 * composer's form rather than a descendant.
 */
describe('Button type', () => {
  it('defaults to type="button", not the HTML default of submit', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('still submits when a caller asks for it', () => {
    render(<Button type="submit">Send</Button>);

    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('honours type="reset" too, so the default is a default and not an override', () => {
    render(<Button type="reset">Clear</Button>);

    expect(screen.getByRole('button', { name: 'Clear' })).toHaveAttribute('type', 'reset');
  });

  it('does not submit the form it sits inside', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={onSubmit}>
        <Button>Not a submit</Button>
      </form>,
    );

    screen.getByRole('button', { name: 'Not a submit' }).click();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('leaves an asChild button to the element it renders', () => {
    // `asChild` hands rendering to the child, which may not be a <button> at
    // all — forcing a type onto an anchor would be wrong.
    render(
      <Button asChild>
        <a href="https://example.com">Link</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Link' })).not.toHaveAttribute('type');
  });
});
