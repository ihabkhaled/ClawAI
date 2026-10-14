import { Locale } from '@claw/shared-types';
import { z } from 'zod';

import { ModelOutputFailureKind } from '../../../../common/enums/model-output-failure-kind.enum';
import { authorDraftSchema } from '../../types/generation-pipeline.types';
import { buildAuthorSystemPrompt } from '../author-prompt.utility';
import { canonicalCitationText, resolveEvidenceId } from '../citation-id.utility';
import { classifyModelOutput } from '../describe-output-failure.utility';
import { escalatedOutputTokens } from '../escalate-output-tokens.utility';
import { normalizeAuthorOutput } from '../normalize-author-output.utility';
import { parseModelJson } from '../parse-model-json.utility';
import { repairJsonText } from '../repair-json-text.utility';
import { stripReasoningBlocks } from '../strip-reasoning-blocks.utility';

const ID_A = '922197023defa567';
const ID_B = '9f056d1e0e48b360';
const EVIDENCE = new Map([
  [ID_A, 'https://example.com/a'],
  [ID_B, 'https://example.com/b'],
]);
const RLM = String.fromCodePoint(0x200f);
const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);
const schema = z.preprocess(
  (value) => normalizeAuthorOutput(value, EVIDENCE),
  authorDraftSchema.refine((d) => d.citations.every((c) => EVIDENCE.get(c.evidenceId) === c.url)),
);

/** The id as an Arabic text renderer shows it: every ASCII digit replaced by its Arabic-Indic form. */
function arabicDigits(text: string): string {
  return text.replaceAll(/\d/gu, (digit) => String.fromCodePoint(0x660 + Number(digit)));
}

function ids(reply: string): string[] {
  const parsed = schema.safeParse(parseModelJson(reply, schema));
  if (!parsed.success) throw new Error('reply was refused');
  return parsed.data.citations.map((citation) => citation.evidenceId);
}

describe('citation ids mangled by non-English output', () => {
  it('folds Arabic-Indic, Persian, Devanagari, Thai and full-width digits', () => {
    expect(canonicalCitationText(arabicDigits('id-9022'))).toBe('id-9022');
    expect(canonicalCitationText('id-۱۲')).toBe('id-12');
    expect(canonicalCitationText('id-१२')).toBe('id-12');
    expect(canonicalCitationText('id-๑๒')).toBe('id-12');
    expect(canonicalCitationText('id-１２')).toBe('id-12');
  });

  it('removes direction marks, isolates, quotes and every bracket width around an id', () => {
    expect(canonicalCitationText(`${LRI}【${RLM}abc123${RLM}】${PDI}`)).toBe('abc123');
    expect(canonicalCitationText('［abc123］')).toBe('abc123');
    expect(canonicalCitationText('`abc123`')).toBe('abc123');
  });

  it('resolves case differences and a url given instead of the id, but not a made-up id', () => {
    expect(resolveEvidenceId(ID_A.toUpperCase(), EVIDENCE)).toBe(ID_A);
    expect(resolveEvidenceId('https://example.com/b', EVIDENCE)).toBe(ID_B);
    expect(resolveEvidenceId('ffffffffffffffff', EVIDENCE)).toBeNull();
  });

  it('accepts an Arabic guide whose list and markers carry Arabic-Indic digits and RTL marks', () => {
    const mangledId = `${RLM}${arabicDigits(ID_A)}${RLM}`;
    const reply = JSON.stringify({
      markdown: `# دليل المضخات الحرارية\n\nتوفر المضخات طاقة أقل [${mangledId}] وتكلفة أقل [${arabicDigits(ID_B)}، ${mangledId}].`,
      citations: [{ evidenceId: mangledId, url: 'https://example.com/a' }],
    });
    const parsed = schema.safeParse(parseModelJson(reply, schema));
    expect(parsed.success && parsed.data.citations).toEqual([
      { evidenceId: ID_A, url: 'https://example.com/a' },
    ]);
    // The markers in the body are rewritten to plain ASCII, so the reader still renders them.
    expect(parsed.success && parsed.data.markdown).toContain(`[${ID_A}]`);
    expect(parsed.success && parsed.data.markdown).toContain(`[${ID_B}, ${ID_A}]`);
  });

  it('accepts a Japanese article citing with full-width brackets and the ideographic comma', () => {
    const reply = JSON.stringify({
      markdown: `# ヒートポンプ\n\n効率が高い［${ID_A}］。さらに【${ID_A}、${ID_B}】。`,
    });
    expect(ids(reply)).toEqual([ID_A, ID_B]);
  });

  it('accepts a German article with ids in upper case and a bare-url citation', () => {
    const reply = JSON.stringify({
      markdown: `# Wärmepumpen\n\nSie sind effizient [${ID_A.toUpperCase()}].`,
      citations: [{ url: 'https://example.com/b' }],
    });
    expect(ids(reply)).toEqual([ID_B]);
  });

  it('leaves a link text bracket alone and still refuses a citation outside the evidence list', () => {
    const body = normalizeAuthorOutput(
      {
        markdown: '[Reuters Bericht](https://example.com/x) [ffffffffffffffff]',
        citations: ['ffffffffffffffff'],
      },
      EVIDENCE,
    );
    expect(body).toMatchObject({
      markdown: '[Reuters Bericht](https://example.com/x) [ffffffffffffffff]',
    });
    expect(schema.safeParse(body).success).toBe(false);
  });
});

describe('reasoning blocks', () => {
  const answer = JSON.stringify({
    markdown: '# T\n\nx',
    citations: [{ evidenceId: ID_A, url: 'https://example.com/a' }],
  });

  it('skips a closed block, including braces inside the thinking', () => {
    const reply = `<think>Plan: return {"markdown": "draft"} then cite.</think>\n\n${answer}`;
    expect(schema.safeParse(parseModelJson(reply, schema)).success).toBe(true);
  });

  it('skips a block when the opening tag was dropped by the server', () => {
    expect(stripReasoningBlocks(`I think {"a": 1}</think>${answer}`)).toEqual({
      answer,
      unfinished: false,
    });
  });

  it('reads an answer wrapped in a code fence after the thinking', () => {
    const reply = `<thinking>hmm</thinking>\n\`\`\`json\n${answer}\n\`\`\``;
    expect(schema.safeParse(parseModelJson(reply, schema)).success).toBe(true);
  });

  it('reports thinking that never closes as unfinished and yields no JSON', () => {
    const reply = '<think>The evidence says {"a": 1} and then';
    expect(stripReasoningBlocks(reply)).toEqual({ answer: '', unfinished: true });
    expect(parseModelJson(reply, schema)).toBeUndefined();
    expect(classifyModelOutput(reply, schema)).toBe(ModelOutputFailureKind.TRUNCATED);
  });

  it('does not touch a JSON answer that mentions the tag inside its own text', () => {
    const mention = JSON.stringify({
      markdown: 'Models emit <think>x</think> tags.',
      citations: [{ evidenceId: ID_A, url: 'https://example.com/a' }],
    });
    const parsed = schema.safeParse(parseModelJson(mention, schema));
    expect(parsed.success && parsed.data.markdown).toContain('<think>x</think>');
  });
});

describe('almost-JSON replies', () => {
  it('reads long markdown written with raw line breaks inside the string', () => {
    const reply = `{"markdown": "# Titel\n\nAbsatz eins.\n\tEingerückt", "citations": [{"evidenceId": "${ID_A}", "url": "https://example.com/a"}],}`;
    const parsed = schema.safeParse(parseModelJson(reply, schema));
    expect(parsed.success && parsed.data.markdown).toContain('Absatz eins.\n\tEingerückt');
  });

  it('repairs only line breaks and trailing commas', () => {
    expect(repairJsonText('{"a": "x\ny",}')).toBe('{"a": "x\\ny"}');
    expect(repairJsonText('{"a": "p, ]"}')).toBe('{"a": "p, ]"}');
  });

  it('still refuses a reply cut off in the middle of the markdown', () => {
    const reply = '{"markdown": "# مقال طويل جدا يتوقف هنا';
    expect(parseModelJson(reply, schema)).toBeUndefined();
    expect(classifyModelOutput(reply, schema)).toBe(ModelOutputFailureKind.TRUNCATED);
  });

  it('reads a fence whose language tag is written in capitals', () => {
    expect(parseModelJson('```JSON\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe('output ceiling after a cut-off reply', () => {
  it('grows by half for English and by the language factor for costly scripts', () => {
    expect(escalatedOutputTokens(8192, Locale.EN)).toBe(12_288);
    expect(escalatedOutputTokens(8192, Locale.DE)).toBe(12_288);
    expect(escalatedOutputTokens(8192, Locale.AR)).toBe(16_384);
    expect(escalatedOutputTokens(8192, Locale.HI)).toBe(18_023);
  });

  it('never exceeds the largest ceiling a role may ask for', () => {
    expect(escalatedOutputTokens(30_000, Locale.AR)).toBe(32_768);
  });
});

describe('author system prompt', () => {
  it('names the language and keeps ids, keys and markers in ASCII', () => {
    const prompt = buildAuthorSystemPrompt(Locale.AR);
    expect(prompt).toContain('in Arabic (ar)');
    expect(prompt).toContain('ASCII brackets, ASCII digits and letters');
    expect(prompt).toContain('never translated, transliterated or converted to Arabic digits');
    expect(prompt).toContain(
      '{"markdown": string, "citations": [{"evidenceId": string, "url": string}]}',
    );
  });

  it('keeps the minimal example with the literal backslash-n the models were shown', () => {
    expect(buildAuthorSystemPrompt(Locale.EN)).toContain(
      String.raw`"# Title\n\nA claim [abc123]."`,
    );
  });
});
