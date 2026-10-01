import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FeedbackMarkdownEditor } from '@/components/feedback/feedback-markdown-editor';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { ar } from '@/lib/i18n/locales/ar';
import { en } from '@/lib/i18n/locales/en';

describe('FeedbackMarkdownEditor toolbar labels', () => {
  it('shows the Arabic toolbar labels, not English ones', () => {
    render(
      <LocaleProvider initialLocale={Locale.AR} initialDictionary={ar}>
        <FeedbackMarkdownEditor value="" onChange={() => undefined} />
      </LocaleProvider>,
    );

    expect(screen.getByText(ar.feedback.editor.linkLabel)).toBeInTheDocument();
    expect(screen.getByText(`• ${ar.feedback.editor.listLabel}`)).toBeInTheDocument();
    expect(screen.queryByText('Link')).toBeNull();
    expect(screen.queryByText('• List')).toBeNull();
  });

  it('shows the English toolbar labels in English', () => {
    render(
      <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
        <FeedbackMarkdownEditor value="" onChange={() => undefined} />
      </LocaleProvider>,
    );

    expect(screen.getByText('Link')).toBeInTheDocument();
    expect(screen.getByText('1. List')).toBeInTheDocument();
  });
});

describe('FeedbackMarkdownEditor textarea height', () => {
  it('sets an explicit height, because the touch layer overrides min-height', () => {
    render(
      <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
        <FeedbackMarkdownEditor value="" onChange={() => undefined} />
      </LocaleProvider>,
    );

    expect(screen.getByRole('textbox').className).toContain('h-36');
  });
});
