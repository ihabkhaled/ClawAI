import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function Harness(props: { onOuterPaste?: () => void; disabled?: boolean }): ReactElement {
  const [value, setValue] = useState('');
  return (
    <div onPaste={props.onOuterPaste}>
      <RichPromptTextarea
        value={value}
        onChange={setValue}
        ariaLabel="prompt"
        disabled={props.disabled}
      />
    </div>
  );
}

const TABLE = '<table><tr><th>a</th></tr><tr><td>1</td></tr></table>';

function paste(el: HTMLElement, html: string): void {
  fireEvent.paste(el, {
    clipboardData: { getData: (type: string) => (type === 'text/html' ? html : '') },
  });
}

describe('RichPromptTextarea paste', () => {
  it('pastes an HTML table as a markdown table and keeps it from the dropzone', () => {
    const outer = vi.fn();
    render(<Harness onOuterPaste={outer} />);
    const textarea = screen.getByLabelText('prompt');
    paste(textarea, TABLE);
    expect(textarea).toHaveValue('| a |\n| --- |\n| 1 |');
    expect(outer).not.toHaveBeenCalled();
  });

  it('leaves a non-table paste to the browser', () => {
    const outer = vi.fn();
    render(<Harness onOuterPaste={outer} />);
    const textarea = screen.getByLabelText('prompt');
    paste(textarea, '<p>plain</p>');
    expect(textarea).toHaveValue('');
    expect(outer).toHaveBeenCalled();
  });

  it('does nothing while disabled', () => {
    render(<Harness disabled />);
    const textarea = screen.getByLabelText('prompt');
    paste(textarea, TABLE);
    expect(textarea).toHaveValue('');
  });
});
