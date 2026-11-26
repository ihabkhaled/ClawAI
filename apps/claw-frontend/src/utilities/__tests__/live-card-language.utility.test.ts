import { describe, expect, it } from 'vitest';

import { LiveCardLanguageState, LiveFeedEventKind } from '@/enums/live.enum';
import type { LiveFeedCard } from '@/types/live.types';
import { liveCardLanguageState, liveTextMatchesLanguage } from '@/utilities/live-reveal.utility';

const card = (title: string, body: string, extra: Partial<LiveFeedCard> = {}): LiveFeedCard => ({
  eventId: 'ev-1',
  kind: LiveFeedEventKind.HIGHLIGHT,
  title,
  body,
  importance: 1,
  version: 1,
  startAt: 0,
  endAt: null,
  highlightType: null,
  receivedAt: 1_000,
  ...extra,
});

describe('liveTextMatchesLanguage', () => {
  it.each([
    ['The match starts now', 'en', true],
    ['المباراة تبدأ الآن', 'en', false],
    ['المباراة تبدأ الآن', 'ar', true],
    ['The match starts now', 'ar', false],
    ['Матч начинается', 'ru', true],
    ['試合が始まります', 'ja', true],
    ['比赛开始了', 'zh', true],
    ['La partita inizia', 'it', true],
    ['0:44 — 12', 'ar', true],
  ])('%s in %s → %s', (text, language, expected) => {
    expect(liveTextMatchesLanguage(text, language)).toBe(expected);
  });
});

describe('liveCardLanguageState (an English viewer never reads an Arabic card silently)', () => {
  it('is READY when the card is already in the viewer language or translated', () => {
    expect(liveCardLanguageState(card('Kickoff', 'It starts'), 'en', 2_000)).toBe(
      LiveCardLanguageState.READY,
    );
    expect(
      liveCardLanguageState(
        card('انطلاق', 'تبدأ المباراة', {
          translatedTitle: 'Kickoff',
          translatedBody: 'It starts',
        }),
        'en',
        2_000,
      ),
    ).toBe(LiveCardLanguageState.READY);
  });

  it('is PENDING while a foreign card waits for its translation, then ORIGINAL (marked)', () => {
    const arabic = card('انطلاق', 'تبدأ المباراة');
    expect(liveCardLanguageState(arabic, 'en', 1_000 + 10_000)).toBe(LiveCardLanguageState.PENDING);
    expect(liveCardLanguageState(arabic, 'en', 1_000 + 46_000)).toBe(
      LiveCardLanguageState.ORIGINAL,
    );
  });
});
