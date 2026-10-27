import { isEvidenceGapBlocker, onlyEvidenceGaps, splitBlockers } from '../classify-blocker.utility';

/** The two blockers the Judge gave three times in production on 2026-10-27, verbatim. */
const PRODUCTION_BLOCKERS = [
  'the article does not meet the request to cite independent primary sources on sycophancy and reward hacking; the text admits the gap but must fill it or explicitly narrow the scope',
  'repository files are not in the evidence, so claims about AI-Psychiatry cannot be verified',
];

const EVIDENCE_GAPS: Record<string, string[]> = {
  en: [
    ...PRODUCTION_BLOCKERS,
    'The key statistics have no citation and cannot be traced to a source.',
    'Several claims are unverified; add references to the original studies.',
    'No supporting evidence is given for the claim that the model improved.',
    'The article relies on unsupported claims about the repository.',
  ],
  ar: [
    'المقال لا يحقق طلب الاستشهاد بمصادر أولية مستقلة عن التملق واختراق المكافأة؛ يعترف النص بالفجوة لكن يجب سدها أو تضييق النطاق صراحة',
    'ملفات المستودع غير موجودة ضمن الأدلة، لذا لا يمكن التحقق من الادعاءات حول AI-Psychiatry',
    'الأرقام المذكورة غير موثقة ولا تستند إلى مراجع',
  ],
  ja: [
    '一次資料に基づく出典が示されておらず、主張を検証できない',
    'リポジトリのファイルが根拠に含まれていないため、記述を確認できない',
    '主要な数値に引用がありません',
  ],
  de: [
    'Es fehlen unabhängige Primärquellen; die Behauptungen sind nicht belegt.',
    'Die Dateien des Repositorys sind nicht in den Belegen enthalten, daher ist nichts nachprüfbar (nicht nachprüfbar).',
    'Zitate und Quellen für die Zahlen fehlen.',
  ],
  fa: [
    'مقاله منابع اولیه مستقل را ذکر نکرده و ادعاها قابل بررسی نیست',
    'فایل‌های مخزن در شواهد نیستند و ادعاها تأیید نشده باقی می‌مانند',
    'برای آمار ذکرشده هیچ منبعی آورده نشده است',
  ],
  zh: [
    '文章没有引用独立的一手资料，且无法验证关于仓库文件的说法',
    '关键数据缺少来源，属于未经验证的陈述',
    '文章缺少证据支持其核心结论',
  ],
};

const NOT_EVIDENCE_GAPS: Record<string, string[]> = {
  en: [
    'The second section contradicts the introduction.',
    'The tone shifts between formal and casual in the middle section.',
    'The structure is confusing and the headings are inconsistent.',
    'The article wastes the reader’s time with resources metaphors.',
    'The conclusion repeats the introduction word for word.',
  ],
  ar: ['الفقرة الثانية تناقض المقدمة', 'بنية المقال مفككة والعناوين غير متسقة'],
  ja: ['第2節の構成が冗長で、導入と結論が矛盾している', '文体が途中で変わっている'],
  de: [
    'Der Aufbau ist unübersichtlich und der Ton wechselt mitten im Text.',
    'Der zweite Abschnitt widerspricht der Einleitung.',
  ],
  fa: ['ساختار مقاله نامنظم است و بخش دوم با مقدمه تناقض دارد', 'لحن متن در میانه تغییر می‌کند'],
  zh: ['第二部分与引言相互矛盾，结构混乱', '语气在中间部分发生变化'],
};

describe('isEvidenceGapBlocker', () => {
  it.each(Object.entries(EVIDENCE_GAPS))(
    'recognises a missing-evidence blocker in %s',
    (_l, list) => {
      for (const blocker of list) expect(isEvidenceGapBlocker(blocker), blocker).toBe(true);
    },
  );

  it.each(Object.entries(NOT_EVIDENCE_GAPS))(
    'does not treat a style or structure blocker in %s as an evidence gap',
    (_l, list) => {
      for (const blocker of list) expect(isEvidenceGapBlocker(blocker), blocker).toBe(false);
    },
  );

  it('matches both production blockers verbatim', () => {
    for (const blocker of PRODUCTION_BLOCKERS) expect(isEvidenceGapBlocker(blocker)).toBe(true);
  });

  it('matches a Latin term only at the start of a word', () => {
    expect(isEvidenceGapBlocker('The text wastes resources on filler.')).toBe(false);
    expect(isEvidenceGapBlocker('Add a source for the second claim.')).toBe(true);
  });

  it('ignores Arabic diacritics, tatweel and zero-width marks', () => {
    expect(isEvidenceGapBlocker('يجب إضافة مَصَـادِر')).toBe(true);
    expect(isEvidenceGapBlocker('منا‌بع')).toBe(true);
  });

  it('is false for an empty blocker', () => {
    expect(isEvidenceGapBlocker('')).toBe(false);
  });
});

describe('splitBlockers and onlyEvidenceGaps', () => {
  it('splits a mixed list and keeps the original texts', () => {
    const mixed = [...PRODUCTION_BLOCKERS, 'The second section contradicts the introduction.'];
    const split = splitBlockers(mixed);
    expect(split.evidenceGaps).toEqual(PRODUCTION_BLOCKERS);
    expect(split.others).toEqual(['The second section contradicts the introduction.']);
    expect(onlyEvidenceGaps(mixed)).toBe(false);
  });

  it('is true only for a non-empty list made of evidence gaps', () => {
    expect(onlyEvidenceGaps(PRODUCTION_BLOCKERS)).toBe(true);
    expect(onlyEvidenceGaps([])).toBe(false);
  });
});
