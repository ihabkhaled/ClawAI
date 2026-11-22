import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IntentPickOverriddenNotice } from '@/components/chat/intent-pick-overridden-notice';
import { en } from '@/lib/i18n/locales/en';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import { readIntentPickOverridden } from '@/utilities/picked-model-fallback.utility';

const t = (key: string, params?: Record<string, string | number>): string =>
  resolveTranslation(en, key, params);

describe('IntentPickOverriddenNotice', () => {
  it('says the answer is text and names the media-only model', () => {
    render(<IntentPickOverriddenNotice info={{ provider: 'GEMINI', model: 'veo-3' }} t={t} />);

    expect(screen.getByTestId('intent-pick-overridden-notice')).toHaveTextContent(
      'Answered in text — veo-3 only makes images, videos or files. Pick it again and describe what to create.',
    );
  });
});

describe('readIntentPickOverridden', () => {
  it('reads a stored override', () => {
    expect(
      readIntentPickOverridden({ intentPickOverridden: { provider: 'GEMINI', model: 'veo-3' } }),
    ).toEqual({ provider: 'GEMINI', model: 'veo-3' });
  });

  it.each([
    [null],
    [{}],
    [{ intentPickOverridden: 'veo-3' }],
    [{ intentPickOverridden: { provider: 'GEMINI', model: '' } }],
    [{ intentPickOverridden: { provider: '', model: 'veo-3' } }],
  ])('returns null for %j', (metadata) => {
    expect(readIntentPickOverridden(metadata)).toBeNull();
  });
});
