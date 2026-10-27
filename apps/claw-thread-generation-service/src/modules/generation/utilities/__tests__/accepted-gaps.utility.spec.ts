import { Locale } from '@claw/shared-types';

import {
  hasLimitationsSection,
  matchesAcceptedGap,
  normalizeAcceptedGaps,
  splitAcceptedBlockers,
} from '../accepted-gaps.utility';

type MatchCase = {
  name: string;
  accepted: string;
  same: string;
  other: string;
};

const MATCH_CASES: MatchCase[] = [
  {
    name: 'English',
    accepted: 'does not cite independent primary sources for sycophancy and reward hacking',
    same: 'the citations do not match the evidence requested about sycophancy or reward hacking',
    other:
      'repository files are not in the evidence, so claims about AI-Psychiatry cannot be verified',
  },
  {
    name: 'Arabic',
    accepted: 'لا يستشهد المقال بمصادر أولية مستقلة حول التملق واختراق المكافآت',
    same: 'لا تتطابق الاستشهادات مع الأدلة المطلوبة حول التملق واختراق المكافآت',
    other: 'ملفات المستودع غير موجودة في الأدلة لذلك لا يمكن التحقق من ادعاءات أداة الفحص',
  },
  {
    name: 'Japanese',
    accepted: '持続的に追従する傾向についての一次資料が引用されていない',
    same: '追従する傾向に関する一次資料の引用が不足している',
    other: '別のリポジトリのファイルが証拠に含まれていないため検証できない',
  },
  {
    name: 'German',
    accepted: 'Es fehlen unabhängige Primärquellen zu Sykophantie und Reward Hacking',
    same: 'Die Zitate belegen Sykophantie und Reward Hacking nicht; Primärquellen fehlen',
    other:
      'Die Dateien des Repositorys sind nicht in den Belegen, die Aussagen sind nicht überprüfbar',
  },
  {
    name: 'Persian',
    accepted: 'منابع اصلی مستقل درباره چاپلوسی و هک پاداش یافت نشد',
    same: 'ارجاع به منابع اصلی درباره چاپلوسی و هک پاداش وجود ندارد',
    other: 'فایل‌های مخزن در شواهد نیست و ادعاهای مربوط به ابزار قابل تایید نیست',
  },
  {
    name: 'Chinese',
    accepted: '缺少关于谄媚和奖励黑客的独立一手资料',
    same: '关于谄媚和奖励黑客的一手资料没有被引用',
    other: '缺少仓库文件作为证据，无法验证',
  },
];

describe('normalizeAcceptedGaps', () => {
  it('trims, collapses whitespace, drops blanks and repeats, sorts and bounds', () => {
    expect(normalizeAcceptedGaps(['  b   gap ', 'a gap', 'b gap', '   ', ''])).toEqual([
      'a gap',
      'b gap',
    ]);
    expect(normalizeAcceptedGaps(undefined)).toEqual([]);
    expect(
      normalizeAcceptedGaps(Array.from({ length: 12 }, (_, i) => `gap ${String(i)}`)),
    ).toHaveLength(8);
  });

  it('removes control characters so no hidden line reaches a prompt', () => {
    expect(normalizeAcceptedGaps(['first\u0000line\nsecond\u007Fline'])).toEqual([
      'firstline secondline',
    ]);
  });

  it('is order-insensitive, so the same choice is the same request', () => {
    expect(normalizeAcceptedGaps(['b', 'a'])).toEqual(normalizeAcceptedGaps(['a', 'b']));
  });

  it('shortens a long entry to 300 characters', () => {
    const [only] = normalizeAcceptedGaps(['x'.repeat(500)]);
    expect([...(only ?? '')]).toHaveLength(300);
  });
});

describe.each(MATCH_CASES)('matchesAcceptedGap ($name)', ({ accepted, same, other }) => {
  it('matches the same topic worded differently', () => {
    expect(matchesAcceptedGap(same, [accepted])).toBe(true);
  });

  it('matches the accepted text itself', () => {
    expect(matchesAcceptedGap(accepted, [accepted])).toBe(true);
  });

  it('does not match a sourcing blocker about another topic', () => {
    expect(matchesAcceptedGap(other, [accepted])).toBe(false);
  });

  it('matches nothing when no gap was accepted', () => {
    expect(matchesAcceptedGap(same, [])).toBe(false);
  });
});

describe('matchesAcceptedGap guards', () => {
  const accepted = ['does not cite primary sources for sycophancy'];

  it('never matches a blocker that is not an evidence gap, whatever it mentions', () => {
    expect(
      matchesAcceptedGap('the section on sycophancy contradicts the introduction', accepted),
    ).toBe(false);
    expect(matchesAcceptedGap('The tone about sycophancy is unsafe and insulting', accepted)).toBe(
      false,
    );
  });

  it('a purely generic sourcing blocker matches only a generic accepted gap', () => {
    expect(matchesAcceptedGap('does not cite independent primary sources', accepted)).toBe(false);
    expect(
      matchesAcceptedGap('does not cite independent primary sources', [
        'the article cites no primary sources',
      ]),
    ).toBe(true);
  });

  it('one shared word is not enough when the topic has several', () => {
    expect(
      matchesAcceptedGap('no sources for sycophancy, reward hacking and instruction following', [
        'no sources for instruction benchmarks and leaderboards',
      ]),
    ).toBe(false);
  });
});

describe('splitAcceptedBlockers', () => {
  it('sets aside only the accepted blockers and keeps the rest', () => {
    const split = splitAcceptedBlockers(
      [
        'does not cite primary sources for sycophancy',
        'The second section contradicts the introduction.',
        'no sources for the repository benchmark results',
      ],
      ['does not cite primary sources for sycophancy'],
    );

    expect(split.waived).toEqual(['does not cite primary sources for sycophancy']);
    expect(split.remaining).toEqual([
      'The second section contradicts the introduction.',
      'no sources for the repository benchmark results',
    ]);
  });
});

describe('hasLimitationsSection', () => {
  const gap = 'does not cite primary sources for sycophancy';

  it('is true when no gap was accepted', () => {
    expect(hasLimitationsSection('# Title\n\nBody', [], Locale.EN)).toBe(true);
  });

  it('needs a limitations heading', () => {
    expect(hasLimitationsSection(`# T\n\nThe article ${gap}.`, [gap], Locale.EN)).toBe(false);
  });

  it('needs an item for each accepted gap inside the section', () => {
    const complete = `# T\n\n## Limitations and unverified items\n\n- No primary sources for sycophancy were found.\n\n## Sources\n- x`;
    const missing = `# T\n\n## Limitations and unverified items\n\n- Formatting is basic.\n\n## Sources\n- x`;
    const outside = `# T\n\n## Limitations and unverified items\n\n- Formatting is basic.\n\n## Sources\n- primary sources for sycophancy`;

    expect(hasLimitationsSection(complete, [gap], Locale.EN)).toBe(true);
    expect(hasLimitationsSection(missing, [gap], Locale.EN)).toBe(false);
    expect(hasLimitationsSection(outside, [gap], Locale.EN)).toBe(false);
  });

  it('accepts paragraphs and numbered items, and nested headings, inside the section', () => {
    const text = `# T\n\n## Limitations\n\n1. Primary sources for sycophancy: none found.\n\n### Detail\n\nUnverified.\n\n## Sources\n- x`;

    expect(hasLimitationsSection(text, [gap], Locale.EN)).toBe(true);
  });

  it('a section closed by the next heading of the same level ends there', () => {
    const text = `# T\n\n## Limitations\n\n- Formatting only.\n\n## Appendix\n\n- primary sources for sycophancy`;

    expect(hasLimitationsSection(text, [gap], Locale.EN)).toBe(false);
  });

  it.each([
    [
      Locale.AR,
      '## القيود والعناصر غير المتحقق منها\n\n- لم نجد مصادر أولية مستقلة حول التملق واختراق المكافآت.',
      'لا يستشهد المقال بمصادر أولية مستقلة حول التملق واختراق المكافآت',
    ],
    [
      Locale.JA,
      '## 制限事項と未検証の項目\n\n- 追従する傾向についての一次資料は見つからなかった。',
      '追従する傾向についての一次資料が引用されていない',
    ],
    [
      Locale.DE,
      '## Einschränkungen und nicht verifizierte Punkte\n\n- Unabhängige Primärquellen zu Sykophantie und Reward Hacking fehlen.',
      'Es fehlen unabhängige Primärquellen zu Sykophantie und Reward Hacking',
    ],
    [
      Locale.FA,
      '## محدودیت‌ها و موارد تأییدنشده\n\n- منابع اصلی مستقل درباره چاپلوسی و هک پاداش یافت نشد.',
      'منابع اصلی مستقل درباره چاپلوسی و هک پاداش یافت نشد',
    ],
    [
      Locale.ZH,
      '## 局限性与未经验证的事项\n\n- 没有找到关于谄媚和奖励黑客的独立一手资料。',
      '缺少关于谄媚和奖励黑客的独立一手资料',
    ],
  ])('finds the section in %s', (locale, section, accepted) => {
    expect(hasLimitationsSection(`# T\n\n${section}\n\n## Sources\n- x`, [accepted], locale)).toBe(
      true,
    );
    expect(hasLimitationsSection('# T\n\nBody only', [accepted], locale)).toBe(false);
  });
});
